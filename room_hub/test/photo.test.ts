import assert from "node:assert/strict";
import { test } from "node:test";
import { ROUNDS } from "../src/protocol.js";
import { api, buyRoom, connectWs, fakeJpeg, joinAs, sleep, WsClient } from "./helpers.js";
import { startApp } from "./helpers.js";

type Dev = { c: WsClient; deviceId: string; slot: number; name: string };

async function seat(base: string, roomId: string, names: string[], hostKey: string): Promise<Dev[]> {
  const devs: Dev[] = [];
  for (let i = 0; i < names.length; i++) {
    const j = await joinAs(base, roomId, names[i], i === 0 ? hostKey : undefined);
    assert.equal(j.status, 200, JSON.stringify(j.json));
    assert.equal(j.data.role, i === 0 ? "host" : "guest");
    const c = await connectWs(j.data.wsUrl, j.data.joinToken, names[i]);
    const w = await c.waitFor("welcome");
    assert.equal(w.you, j.deviceId);
    devs.push({ c, deviceId: j.deviceId, slot: j.data.slot, name: names[i] });
  }
  return devs;
}

test("4. full WS photo flow: join x4, ROOM_FULL, 4 rounds, compose, completed, ROOM_COMPLETED", async () => {
  const s = await startApp();
  const all: WsClient[] = [];
  try {
    const { roomId, hostKey } = await buyRoom(s.base, "squad");
    const room0 = await api(s.base, "GET", `/api/rooms/${roomId}`);
    assert.equal(room0.data.status, "open");
    assert.equal(room0.data.maxDevices, 4);

    const devs = await seat(s.base, roomId, ["Host", "Ann", "Bob", "Cy"], hostKey);
    devs.forEach((d) => all.push(d.c));
    assert.deepEqual(devs.map((d) => d.slot).sort(), [0, 1, 2, 3]);

    // same deviceId rejoining keeps its slot
    const again = await api(s.base, "POST", `/api/rooms/${roomId}/join`, { name: "Ann", deviceId: devs[1].deviceId });
    assert.equal(again.data.slot, devs[1].slot);

    // 5th device
    const fifth = await joinAs(s.base, roomId, "Dan");
    assert.equal(fifth.status, 409);
    assert.equal(fifth.error.code, "ROOM_FULL");

    // wrong host key
    const wrong = await joinAs(s.base, roomId, "Eve", "nope-nope-nope-nope-1");
    assert.equal(wrong.status, 401);

    // WS: bad token terminal close
    const bad = new WsClient(`ws://127.0.0.1:${s.port}/ws`);
    await bad.open();
    bad.send({ type: "hello", token: "x.y.z", deviceName: "bad", caps: { mp: false } });
    assert.equal((await bad.waitFor("error")).code, "UNAUTHORIZED");
    assert.equal(await bad.waitClose(), 4003);

    // time sync
    devs[1].c.send({ type: "ping", t: 42 });
    const pong = await devs[1].c.waitFor("pong");
    assert.equal(pong.t, 42);
    assert.ok(Math.abs(pong.serverNow - Date.now()) < 2000);

    const host = devs[0];
    // guests cannot control
    devs[1].c.send({ type: "start_round" });
    assert.equal((await devs[1].c.waitFor("error")).code, "NOT_HOST");

    for (let round = 0; round < ROUNDS; round++) {
      // one retake in round 1 to exercise attempts
      const attempts = round === 1 ? 2 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        host.c.send({ type: "start_round" });
        const cds = await Promise.all(devs.map((d) => d.c.waitFor("countdown", (m) => m.round === round && m.attempt === attempt)));
        assert.equal(new Set(cds.map((m) => m.shootAt)).size, 1, "everyone gets the same shootAt");
        const wait = cds[0].shootAt - Date.now();
        assert.ok(wait > 0 && wait < 400, `shootAt is in the near future (${wait})`);

        // a stale round/attempt is refused
        if (round === 0 && attempt === 0) {
          devs[1].c.send({ type: "upload_req", round: 3, attempt: 7 });
          assert.equal((await devs[1].c.waitFor("error")).code, "INVALID_STATE");
        }
        await sleep(Math.max(0, wait + 20));

        await Promise.all(devs.map(async (d) => {
          d.c.send({ type: "upload_req", round, attempt });
          const u = await d.c.waitFor("upload_url", (m) => m.round === round && m.attempt === attempt);
          assert.equal(u.key, `rooms/${roomId}/r${round}/a${attempt}/s${d.slot}.jpg`);
          const put = await fetch(u.url, { method: "PUT", headers: u.headers, body: new Uint8Array(fakeJpeg(1500 + d.slot)) });
          assert.equal(put.status, 200);
          // a wrong key is refused
          if (round === 0 && attempt === 0 && d.slot === 1) {
            d.c.send({ type: "captured", round, attempt, key: `rooms/${roomId}/r0/a0/s0.jpg`, w: 10, h: 10, bytes: 1500 });
            assert.equal((await d.c.waitFor("error")).code, "BAD_REQUEST");
          }
          d.c.send({ type: "captured", round, attempt, key: u.key, w: 1280, h: 720, bytes: 1500 + d.slot });
        }));

        const rr = await Promise.all(devs.map((d) => d.c.waitFor("round_ready", (m) => m.round === round && m.attempt === attempt)));
        assert.equal(rr[0].stills.length, 4);
        assert.deepEqual(rr[0].missing, []);
        const img = await fetch(rr[0].stills[0].url);
        assert.equal(img.status, 200);
        assert.equal(img.headers.get("access-control-allow-origin"), "*");

        if (attempts === 2 && attempt === 0) {
          host.c.send({ type: "review", round, action: "retake" });
          const st = await host.c.waitFor("state", (m) => m.session.phase === "pose_ready");
          assert.equal(st.session.attempt, 1);
          assert.equal(st.session.retakesLeft, 2);
        } else {
          host.c.send({ type: "review", round, action: "accept" });
          const st = await host.c.waitFor("state", (m) => m.session.phase === (round === ROUNDS - 1 ? "composing" : "pose_ready"));
          assert.equal(Object.keys(st.session.accepted).length, round + 1);
        }
      }
    }

    // compose
    devs[2].c.send({ type: "compose_req" });
    assert.equal((await devs[2].c.waitFor("error")).code, "NOT_HOST");
    host.c.send({ type: "compose_req" });
    const cu = await host.c.waitFor("compose_url");
    assert.equal(cu.final.key, `rooms/${roomId}/final.jpg`);

    // too-small final is refused
    await fetch(cu.final.url, { method: "PUT", headers: cu.final.headers, body: new Uint8Array(fakeJpeg(2000)) });
    await fetch(cu.thumb.url, { method: "PUT", headers: cu.thumb.headers, body: new Uint8Array(Buffer.alloc(500, 1)) });
    host.c.send({ type: "compose_done", finalKey: cu.final.key, thumbKey: cu.thumb.key });
    assert.equal((await host.c.waitFor("error")).code, "INVALID_STATE");
    assert.equal((await api(s.base, "GET", `/api/rooms/${roomId}`)).data.status, "in_session");

    const big = await fetch(cu.final.url, { method: "PUT", headers: cu.final.headers, body: new Uint8Array(fakeJpeg(80 * 1024)) });
    assert.equal(big.status, 200);
    host.c.send({ type: "compose_done", finalKey: cu.final.key, thumbKey: cu.thumb.key });
    const done = await Promise.all(devs.map((d) => d.c.waitFor("completed")));
    assert.match(done[0].resultUrl, /\/room\/result\/[\w-]+$/);
    const codes = await Promise.all(devs.map((d) => d.c.waitClose()));
    assert.deepEqual(codes, [4001, 4001, 4001, 4001]);

    // join after completion
    const late = await joinAs(s.base, roomId, "Late");
    assert.equal(late.status, 410);
    assert.equal(late.error.code, "ROOM_COMPLETED");
    const ws2 = new WsClient(`ws://127.0.0.1:${s.port}/ws`);
    await ws2.open();
    ws2.send({ type: "hello", token: "stale" });
    assert.equal(await ws2.waitClose(), 4003);

    // result
    const res = await api(s.base, "GET", `/api/results/${done[0].resultId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.stills.length, ROUNDS * 4);
    assert.equal((await fetch(res.data.finalUrl)).status, 200);
    assert.equal((await fetch(res.data.thumbUrl)).status, 200);
    assert.equal(s.app.store.rooms.get(roomId)!.status, "completed");
    // host-key deletes files and record
    const noauth = await api(s.base, "DELETE", `/api/results/${done[0].resultId}`);
    assert.equal(noauth.status, 401);
    const del = await api(s.base, "DELETE", `/api/results/${done[0].resultId}`, undefined, { "x-host-key": hostKey });
    assert.equal(del.data.deleted, true);
    assert.equal((await api(s.base, "GET", `/api/results/${done[0].resultId}`)).status, 404);
    assert.equal((await fetch(res.data.finalUrl)).status, 404);
  } finally {
    all.forEach((c) => c.close());
    await s.stop();
  }
});

test("round_ready after collect timeout lists missing slots", async () => {
  const s = await startApp({ ROUND_COLLECT_TIMEOUT_MS: "500" });
  const all: WsClient[] = [];
  try {
    const { roomId, hostKey } = await buyRoom(s.base, "duo");
    const devs = await seat(s.base, roomId, ["Host", "Ann"], hostKey);
    devs.forEach((d) => all.push(d.c));
    devs[0].c.send({ type: "start_round" });
    const cd = await devs[0].c.waitFor("countdown");
    await sleep(cd.shootAt - Date.now() + 20);
    devs[0].c.send({ type: "upload_req", round: 0, attempt: 0 });
    const u = await devs[0].c.waitFor("upload_url");
    await fetch(u.url, { method: "PUT", headers: u.headers, body: new Uint8Array(fakeJpeg(1200)) });
    devs[0].c.send({ type: "captured", round: 0, attempt: 0, key: u.key, w: 1, h: 1, bytes: 1200 });
    const rr = await devs[0].c.waitFor("round_ready");
    assert.equal(rr.stills.length, 1);
    assert.deepEqual(rr.missing, [devs[1].slot]);
  } finally {
    all.forEach((c) => c.close());
    await s.stop();
  }
});

test("5. peace quorum (all) triggers a countdown only when everyone shows peace and is stable", async () => {
  const s = await startApp();
  const all: WsClient[] = [];
  try {
    const { roomId, hostKey } = await buyRoom(s.base, "duo");
    const devs = await seat(s.base, roomId, ["Host", "Ann"], hostKey);
    devs.forEach((d) => all.push(d.c));
    const [h, g] = devs;
    h.c.send({ type: "settings", trigger: "peace", quorum: "all" });
    await h.c.waitFor("state", (m) => m.session.trigger === "peace");
    h.c.send({ type: "start_round" });
    await h.c.waitFor("state", (m) => m.session.phase === "pose_ready");

    // only one peace: no countdown
    h.c.send({ type: "gesture", peace: true });
    const p1 = await g.c.waitFor("peace", (m) => m.have === 1);
    assert.equal(p1.needed, 2);
    await sleep(350);
    assert.equal(g.c.has("countdown"), false);

    // a flicker that does not hold for PEACE_STABLE_MS does not trigger
    g.c.send({ type: "gesture", peace: true });
    g.c.send({ type: "gesture", peace: false });
    await sleep(350);
    assert.equal(h.c.has("countdown"), false);

    // both hold
    g.c.send({ type: "gesture", peace: true });
    const cd = await h.c.waitFor("countdown");
    assert.equal(cd.round, 0);
    assert.ok(cd.shootAt > Date.now());
    await g.c.waitFor("countdown");
  } finally {
    all.forEach((c) => c.close());
    await s.stop();
  }
});

test("host disconnect pauses; guest is promoted after the grace period", async () => {
  const s = await startApp({ HOST_GRACE_MS: "300" });
  const all: WsClient[] = [];
  try {
    const { roomId, hostKey } = await buyRoom(s.base, "duo");
    const devs = await seat(s.base, roomId, ["Host", "Ann"], hostKey);
    devs.forEach((d) => all.push(d.c));
    devs[0].c.close();
    const leave = await devs[1].c.waitFor("peer_leave");
    assert.equal(leave.id, devs[0].deviceId);
    // no host: guest cannot start yet
    devs[1].c.send({ type: "start_round" });
    assert.equal((await devs[1].c.waitFor("error")).code, "NOT_HOST");
    const upd = await devs[1].c.waitFor("peer_update", (m) => m.peer.id === devs[1].deviceId && m.peer.role === "host");
    assert.equal(upd.peer.role, "host");
  } finally {
    all.forEach((c) => c.close());
    await s.stop();
  }
});
