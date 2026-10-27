import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runJobsOnce } from "../src/jobs.js";
import { createRoom } from "../src/rooms.js";
import { api, connectWs, fakeJpeg, joinAs, sleep, startApp, WsClient } from "./helpers.js";

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

test("6. game room: create, join, game_start, relay, commit-reveal valid and invalid", async () => {
  const s = await startApp();
  const all: WsClient[] = [];
  try {
    const g = await api(s.base, "POST", "/api/game-rooms", { gameId: "suit-arena" });
    assert.equal(g.status, 200);
    assert.match(g.data.joinCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    assert.ok(g.data.expiresAt > Date.now());
    const bad = await api(s.base, "POST", "/api/game-rooms", { gameId: "nope" });
    assert.equal(bad.status, 400);

    const res = await api(s.base, "GET", `/api/rooms/resolve?code=${g.data.joinCode.toLowerCase()}`);
    assert.equal(res.data.roomId, g.data.roomId);
    assert.equal(res.data.kind, "game");

    const ja = await joinAs(s.base, g.data.roomId, "A", g.data.hostKey);
    const jb = await joinAs(s.base, g.data.roomId, "B");
    assert.equal(ja.data.role, "host");
    const a = await connectWs(ja.data.wsUrl, ja.data.joinToken, "A");
    const b = await connectWs(jb.data.wsUrl, jb.data.joinToken, "B");
    all.push(a, b);
    const wa = await a.waitFor("welcome");
    assert.equal(wa.session, null);
    assert.equal(wa.room.kind, "game");
    await b.waitFor("welcome");

    // ready + start
    b.send({ type: "game_start" });
    assert.equal((await b.waitFor("error")).code, "NOT_HOST");
    b.send({ type: "game_ready", on: true });
    const st0 = await a.waitFor("game_state", (m) => m.ready[jb.deviceId] === true);
    assert.equal(st0.phase, "lobby");
    const t0 = Date.now();
    a.send({ type: "game_start" });
    const [sa, sb] = await Promise.all([a.waitFor("game_state", (m) => m.phase === "countdown"), b.waitFor("game_state", (m) => m.phase === "countdown")]);
    assert.equal(sa.seed, sb.seed);
    assert.ok(sa.seed > 0);
    assert.ok(Math.abs(sa.startAt - (t0 + 3000)) < 500);
    await a.waitFor("game_state", (m) => m.phase === "playing", 5000);

    // relay: input goes to the other peer only, with tServer; pose is relayed too
    a.send({ type: "game_input", data: { x: 1 }, tCapture: 123 });
    const gi = await b.waitFor("game_input");
    assert.equal(gi.from, ja.deviceId);
    assert.equal(gi.tCapture, 123);
    assert.ok(gi.tServer >= t0);
    assert.equal(a.has("game_input"), false);
    a.send({ type: "game_pose", data: [[0, 0, 0]], seq: 9 });
    assert.equal((await b.waitFor("game_pose")).seq, 9);

    // commit-reveal valid
    a.send({ type: "game_commit", round: 1, hash: sha("rock:salt-a") });
    assert.equal((await b.waitFor("game_commit")).round, 1);
    b.send({ type: "game_commit", round: 1, hash: sha("paper:salt-b") });
    await a.waitFor("game_commit");
    a.send({ type: "game_reveal", round: 1, choice: "rock", salt: "salt-a" });
    const r1 = await b.waitFor("game_reveal");
    assert.equal(r1.valid, true);
    assert.equal(r1.choice, "rock");
    assert.equal((await a.waitFor("game_reveal")).valid, true);

    // invalid: reveals a different choice than committed
    b.send({ type: "game_reveal", round: 1, choice: "scissors", salt: "salt-b" });
    const r2 = await a.waitFor("game_reveal");
    assert.equal(r2.valid, false);
    assert.equal(r2.from, jb.deviceId);

    // reveal without commit / double commit refused
    a.send({ type: "game_reveal", round: 2, choice: "rock", salt: "x" });
    assert.equal((await a.waitFor("error")).code, "INVALID_STATE");
    a.send({ type: "game_commit", round: 3, hash: sha("a:b") });
    a.send({ type: "game_commit", round: 3, hash: sha("c:d") });
    assert.equal((await a.waitFor("error")).code, "INVALID_STATE");

    // scores end the game when everyone is final
    a.send({ type: "game_score", score: 10, final: true });
    assert.equal((await b.waitFor("game_score")).score, 10);
    b.send({ type: "game_score", score: 7, final: true });
    await a.waitFor("game_state", (m) => m.phase === "ended");

    // photo messages are refused in a game room
    a.send({ type: "start_round" });
    assert.equal((await a.waitFor("error")).code, "INVALID_STATE");

    // TTL job deletes the room and closes sockets
    await runJobsOnce(s.app, Date.now() + 31 * 60 * 1000);
    assert.equal(await a.waitClose(), 4010);
    assert.equal(s.app.store.rooms.has(g.data.roomId), false);
    assert.equal((await api(s.base, "GET", `/api/rooms/resolve?code=${g.data.joinCode}`)).status, 404);
  } finally {
    all.forEach((c) => c.close());
    await s.stop();
  }
});

/** Give a completed-looking room + result with N AI credits directly in the store. */
function seedResult(s: Awaited<ReturnType<typeof startApp>>, credits: number) {
  const { room, hostKey } = createRoom(s.app, { kind: "photo", packageId: "squad_ai", frameId: "songs", maxDevices: 4, aiCredits: credits });
  const resultId = "res-" + crypto.randomBytes(8).toString("hex");
  room.status = "completed";
  room.resultId = resultId;
  s.app.store.results.set(resultId, {
    id: resultId, roomId: room.id, frameId: "songs", createdAt: Date.now(), deleteAt: Date.now() + 1e9,
    finalKey: `rooms/${room.id}/final.jpg`, thumbKey: `rooms/${room.id}/thumb.webp`, stills: [], variants: [],
  });
  return { room, hostKey, resultId };
}

async function uploadInput(s: Awaited<ReturnType<typeof startApp>>, resultId: string, hostKey: string, purpose = "ai_input") {
  const up = await api(s.base, "POST", `/api/results/${resultId}/uploads`, { purpose }, { "x-host-key": hostKey });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  const put = await fetch(up.data.url, { method: "PUT", headers: up.data.headers, body: new Uint8Array(fakeJpeg(3000)) });
  assert.equal(put.status, 200);
  return up.data.key as string;
}

async function pollJob(s: Awaited<ReturnType<typeof startApp>>, jobId: string, want: string) {
  for (let i = 0; i < 60; i++) {
    const j = await api(s.base, "GET", `/api/ai/jobs/${jobId}`);
    if (j.data.status === want) return j.data;
    await sleep(100);
  }
  throw new Error("job never reached " + want);
}

test("7. AI mock job: credit decremented, job done, variant saved, refund on forced failure", async () => {
  const s = await startApp();
  try {
    const { room, hostKey, resultId } = seedResult(s, 1);
    const H = { "x-host-key": hostKey };

    // auth
    const noKey = await api(s.base, "POST", `/api/results/${resultId}/uploads`, { purpose: "ai_input" });
    assert.equal(noKey.status, 401);
    assert.equal((await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "ghibli", inputKey: "x" })).status, 401);

    const inputKey = await uploadInput(s, resultId, hostKey);
    assert.match(inputKey, new RegExp(`^rooms/${room.id}/ai/[\\w-]+-input\\.jpg$`));
    // bad style / foreign key
    assert.equal((await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "nope", inputKey }, H)).status, 400);
    assert.equal((await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "pixar", inputKey: "rooms/other/ai/aaaaaaaaaaaaaaaa-input.jpg" }, H)).status, 400);
    assert.equal(room.aiCredits, 1, "failed validations must not burn credits");

    const job = await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "pixar", inputKey }, H);
    assert.equal(job.status, 200, JSON.stringify(job.json));
    assert.equal(job.data.mock, true);
    assert.equal(job.data.status, "queued");
    assert.equal(room.aiCredits, 0, "credit decremented");
    assert.equal((await api(s.base, "GET", `/api/results/${resultId}`)).data.aiCreditsLeft, 0);

    // no credits left
    const k2 = await uploadInput(s, resultId, hostKey);
    const none = await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "pixar", inputKey: k2 }, H);
    assert.equal(none.status, 402);
    assert.equal(none.error.code, "PAYMENT_REQUIRED");

    const done = await pollJob(s, job.data.jobId, "done");
    assert.equal(done.mock, true);
    const out = await fetch(done.outputUrl);
    assert.equal(out.status, 200);
    assert.equal((await out.arrayBuffer()).byteLength, 3000);
    assert.equal(room.aiCredits, 0, "no refund on success");

    // variant
    const vkey = await uploadInput(s, resultId, hostKey, "variant");
    const v = await api(s.base, "POST", `/api/results/${resultId}/variants`, { jobId: job.data.jobId, key: vkey }, H);
    assert.equal(v.status, 200, JSON.stringify(v.json));
    assert.equal(v.data.variants.length, 1);
    assert.equal(v.data.variants[0].style, "pixar");
    const dup = await api(s.base, "POST", `/api/results/${resultId}/variants`, { jobId: job.data.jobId, key: vkey }, H);
    assert.equal(dup.data.variants.length, 1, "variant is deduplicated");
    const missing = await api(s.base, "POST", `/api/results/${resultId}/variants`, { jobId: job.data.jobId, key: `rooms/${room.id}/variant-neverUploaded1.jpg` }, H);
    assert.equal(missing.status, 400);

    // forced failure: the input vanishes before the job runs -> failed and refunded
    room.aiCredits = 1;
    const k3 = await uploadInput(s, resultId, hostKey);
    const j3 = await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "manga", inputKey: k3 }, H);
    assert.equal(j3.status, 200);
    assert.equal(room.aiCredits, 0);
    fs.rmSync(path.join(s.app.cfg.dataDir, "files", k3));
    const failed = await pollJob(s, j3.data.jobId, "failed");
    assert.ok(failed.error);
    assert.equal(room.aiCredits, 1, "credit refunded after failure");
    // refund happens only once
    await sleep(500);
    assert.equal(room.aiCredits, 1);
  } finally {
    await s.stop();
  }
});

test("AI via fal queue: submits, polls status_url/response_url, stores output; failure refunds", async () => {
  const calls: { url: string; method: string; body?: any; auth?: string }[] = [];
  let mode: "ok" | "fail" = "ok";
  const png = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(900, 7)]);
  const fakeFetch = (async (url: any, init: any = {}) => {
    const u = String(url);
    calls.push({ url: u, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers?.Authorization });
    const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
    if (u === "https://queue.fal.run/fal-ai/flux-pro/kontext") {
      if (mode === "fail") return json({ detail: "no balance" }, 403);
      return json({ request_id: "rq1", status_url: "https://queue.fal.run/fal-ai/flux-pro/requests/rq1/status", response_url: "https://queue.fal.run/fal-ai/flux-pro/requests/rq1" });
    }
    if (u.endsWith("/status")) return json({ status: "COMPLETED" });
    if (u.endsWith("/requests/rq1")) return json({ images: [{ url: "https://cdn.fal.test/out.jpg" }] });
    if (u === "https://cdn.fal.test/out.jpg") return new Response(new Uint8Array(png), { status: 200 });
    return json({}, 404);
  }) as typeof fetch;
  const s = await startApp({ FAL_KEY: "fal-test", AI_POLL_MS: "50" }, { fetch: fakeFetch });
  try {
    const { room, hostKey, resultId } = seedResult(s, 2);
    const H = { "x-host-key": hostKey };
    const k = await uploadInput(s, resultId, hostKey);
    const job = await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "ghibli", inputKey: k }, H);
    assert.equal(job.data.mock, false);
    const done = await pollJob(s, job.data.jobId, "done");
    const out = await fetch(done.outputUrl);
    assert.equal((await out.arrayBuffer()).byteLength, png.length);
    const submit = calls[0];
    assert.equal(submit.auth, "Key fal-test");
    assert.match(submit.body.prompt, /^Redraw this entire photo as a Studio Ghibli/);
    assert.equal(submit.body.guidance_scale, 3.5);
    assert.equal(submit.body.output_format, "jpeg");
    assert.equal(submit.body.num_images, 1);
    assert.equal(submit.body.safety_tolerance, "2");
    assert.match(submit.body.image_url, /^data:image\/jpeg;base64,/); // localhost hub => inlined
    assert.ok(calls.some((c) => c.url.endsWith("/requests/rq1/status")), "uses status_url from the queue");
    assert.equal(room.aiCredits, 1);

    mode = "fail";
    const k2 = await uploadInput(s, resultId, hostKey);
    const j2 = await api(s.base, "POST", `/api/results/${resultId}/ai`, { style: "oil", inputKey: k2 }, H);
    await pollJob(s, j2.data.jobId, "failed");
    assert.equal(room.aiCredits, 1, "refunded");
  } finally {
    await s.stop();
  }
});

test("housekeeping jobs: unpaid order expires, open room abandons with credit note, result TTL deletes files", async () => {
  const s = await startApp();
  try {
    const o = await api(s.base, "POST", "/api/orders", { kind: "room", packageId: "duo", frameId: "songs" });
    const { roomId } = await (async () => {
      const p = await api(s.base, "POST", "/api/orders", { kind: "room", packageId: "squad", frameId: "wedding" });
      const paid = await api(s.base, "POST", `/api/orders/${p.data.orderId}/mock-pay?t=${p.data.orderToken}`);
      return { roomId: paid.data.roomId as string };
    })();
    const { resultId, room, hostKey } = seedResult(s, 0);
    const k = await uploadInput(s, resultId, hostKey);
    const abs = path.join(s.app.cfg.dataDir, "files", k);
    assert.ok(fs.existsSync(abs));

    await runJobsOnce(s.app, Date.now() + 16 * 60 * 1000);
    assert.equal((await api(s.base, "GET", `/api/orders/${o.data.orderId}?t=${o.data.orderToken}`)).data.status, "EXPIRED");
    assert.equal(s.app.store.rooms.get(roomId)!.status, "open");

    await runJobsOnce(s.app, Date.now() + 8 * 24 * 3600 * 1000);
    assert.equal(s.app.store.rooms.get(roomId)!.status, "abandoned");
    assert.equal(s.app.store.creditNotes.length, 1);
    assert.equal((await api(s.base, "POST", `/api/rooms/${roomId}/join`, { name: "x", deviceId: "device-12345678" })).status, 404);

    await runJobsOnce(s.app, Date.now() + 2e9);
    assert.equal(s.app.store.results.has(resultId), false);
    assert.equal(fs.existsSync(abs), false, "files removed with the result");
    assert.equal(s.app.store.rooms.has(room.id), false);
  } finally {
    await s.stop();
  }
});

test("store persists to db.json atomically and reloads", async () => {
  const s = await startApp();
  const dir = s.app.cfg.dataDir;
  const o = await api(s.base, "POST", "/api/orders", { kind: "room", packageId: "duo", frameId: "songs" });
  await api(s.base, "POST", `/api/orders/${o.data.orderId}/mock-pay?t=${o.data.orderToken}`);
  await s.app.store.flush();
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "db.json"), "utf8"));
  assert.equal(raw.rooms.length, 1);
  assert.match(raw.rooms[0].hostKeyHash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(raw).includes(raw.rooms[0].hostKeyHash) && !("hostKey" in raw.rooms[0]), true, "only the hash of the host key is stored");
  const { Store } = await import("../src/store.js");
  const again = new Store(dir);
  again.load();
  assert.equal(again.rooms.size, 1);
  assert.equal(again.codes.size, 1);
  await s.stop();
});
