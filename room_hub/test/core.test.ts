import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { signJwt, verifyJwt } from "../src/jwt.js";
import { LocalStorage } from "../src/storage.js";
import { api, fakeJpeg, startApp } from "./helpers.js";

const TRIPAY = { PAYMENT_MODE: "tripay", TRIPAY_API_KEY: "key-1", TRIPAY_PRIVATE_KEY: "priv-1", TRIPAY_MERCHANT_CODE: "T1234" };

test("1. tripay webhook: HMAC verified, wrong signature rejected, duplicate is idempotent", async () => {
  const calls: { url: string; init: any }[] = [];
  const fakeFetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ success: true, data: { reference: "REF1", qr_string: "00020101QRIS" } }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const s = await startApp(TRIPAY, { fetch: fakeFetch });
  try {
    const o = await api(s.base, "POST", "/api/orders", { kind: "room", packageId: "squad", frameId: "songs" });
    assert.equal(o.status, 200);
    assert.equal(o.data.qrString, "00020101QRIS");
    assert.equal(o.data.mock, false);
    // create request is signed per Tripay spec and hits the sandbox endpoint
    assert.equal(calls[0].url, "https://tripay.co.id/api-sandbox/transaction/create");
    const sent = JSON.parse(calls[0].init.body);
    const expectSig = crypto.createHmac("sha256", "priv-1").update("T1234" + o.data.orderId + 25000).digest("hex");
    assert.equal(sent.signature, expectSig);
    assert.equal(sent.callback_url, `${s.base}/api/payments/tripay/webhook`);
    assert.equal(sent.order_items[0].price, 25000);
    assert.equal(calls[0].init.headers.Authorization, "Bearer key-1");

    // mock-pay is disabled in tripay mode
    const mp = await api(s.base, "POST", `/api/orders/${o.data.orderId}/mock-pay?t=${o.data.orderToken}`);
    assert.equal(mp.status, 403);

    const raw = JSON.stringify({ reference: "REF1", merchant_ref: o.data.orderId, status: "PAID", total_amount: 25000 });
    const good = crypto.createHmac("sha256", "priv-1").update(raw).digest("hex");
    const post = (sig: string) =>
      fetch(`${s.base}/api/payments/tripay/webhook`, {
        method: "POST", body: raw, headers: { "Content-Type": "application/json", "X-Callback-Signature": sig, "X-Callback-Event": "payment_status" },
      });

    assert.equal((await post("0".repeat(64))).status, 401);
    assert.equal((await post("")).status, 401);
    assert.equal(s.app.store.rooms.size, 0, "no room on a bad signature");

    assert.equal((await post(good)).status, 200);
    assert.equal(s.app.store.rooms.size, 1);
    assert.equal((await post(good)).status, 200);
    assert.equal((await post(good)).status, 200);
    assert.equal(s.app.store.rooms.size, 1, "duplicate webhook must not create a second room");

    const st = await api(s.base, "GET", `/api/orders/${o.data.orderId}?t=${o.data.orderToken}`);
    assert.equal(st.data.status, "PAID");
    assert.match(st.data.hostLink, /\/room\/[\w-]+\?k=[\w-]+$/);
    const bad = await api(s.base, "GET", `/api/orders/${o.data.orderId}?t=wrong`);
    assert.equal(bad.status, 401);
  } finally {
    await s.stop();
  }
});

test("2. JWT sign / verify / expiry / tamper", () => {
  const t = signJwt({ roomId: "r1", deviceId: "d1", role: "host", slot: 0 }, "sec", 7200, 1_000_000);
  const p = verifyJwt(t, "sec", 1_000_000 + 1000);
  assert.equal(p?.roomId, "r1");
  assert.equal(p?.slot, 0);
  assert.equal(p?.exp, 1000 + 7200);
  assert.equal(verifyJwt(t, "other", 1_000_000), null, "wrong secret");
  assert.equal(verifyJwt(t, "sec", 1_000_000 + 7200 * 1000 + 1), null, "expired");
  const [h, b, s] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, "base64url").toString()), role: "guest", slot: 3 })).toString("base64url");
  assert.equal(verifyJwt(`${h}.${forged}.${s}`, "sec", 1_000_000), null, "tampered payload");
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  assert.equal(verifyJwt(`${none}.${b}.`, "sec", 1_000_000), null, "alg none");
  assert.equal(verifyJwt("garbage", "sec"), null);
  assert.equal(verifyJwt(undefined, "sec"), null);
});

test("3. local presign: valid roundtrip, tampered signature / expiry / type rejected", async () => {
  const s = await startApp();
  try {
    const st = s.app.storage as LocalStorage;
    const { url, headers } = st.presignPut("rooms/abc/x.jpg", "image/jpeg", 60);
    const body = fakeJpeg(2048);

    const put = (u: string, h: Record<string, string> = headers, b: Buffer = body) => fetch(u, { method: "PUT", headers: h, body: new Uint8Array(b) });

    const u = new URL(url);
    const tamperedSig = new URL(u); tamperedSig.searchParams.set("sig", u.searchParams.get("sig")!.replace(/.$/, (c) => (c === "A" ? "B" : "A")));
    assert.equal((await put(tamperedSig.toString())).status, 403);
    const tamperedExp = new URL(u); tamperedExp.searchParams.set("exp", String(Number(u.searchParams.get("exp")) + 999));
    assert.equal((await put(tamperedExp.toString())).status, 403);
    const otherKey = url.replace("rooms/abc/x.jpg", "rooms/abc/y.jpg");
    assert.equal((await put(otherKey)).status, 403);
    assert.equal((await put(url, { "Content-Type": "text/html" })).status, 415);
    assert.equal((await put(url, headers, fakeJpeg(s.app.cfg.uploadMaxBytes + 10))).status, 413);
    assert.equal(await st.head("rooms/abc/x.jpg"), null, "nothing stored by the rejected attempts");

    const ok = await put(url);
    assert.equal(ok.status, 200);
    assert.equal((await st.head("rooms/abc/x.jpg"))?.size, 2048);

    // an expired link
    const expired = st.presignPut("rooms/abc/z.jpg", "image/jpeg", -5);
    assert.equal((await put(expired.url)).status, 403);

    // GET: signed OK + CORS for canvas; PUT signature cannot be reused for GET
    const get = st.presignGet("rooms/abc/x.jpg", 60);
    const r = await fetch(get);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("access-control-allow-origin"), "*");
    assert.equal(r.headers.get("content-type"), "image/jpeg");
    assert.equal((await r.arrayBuffer()).byteLength, 2048);
    const reuse = new URL(get); reuse.searchParams.set("sig", u.searchParams.get("sig")!);
    assert.equal((await fetch(reuse)).status, 403);
    assert.equal((await fetch(`${s.base}/files/rooms/abc/x.jpg`)).status, 403);
    assert.equal((await fetch(`${s.base}/files/rooms/..%2F..%2Fdb.json?exp=9999999999&sig=x`)).status >= 400, true);
  } finally {
    await s.stop();
  }
});

test("http: health, catalog, CORS preflight, envelope, rate limit headers", async () => {
  const s = await startApp({ ALLOWED_ORIGINS: "http://localhost:3001" });
  try {
    const h = await api(s.base, "GET", "/health");
    assert.deepEqual(h.json, { ok: true, data: { ok: true } });
    const c = await api(s.base, "GET", "/api/catalog");
    assert.equal(c.data.packages.length, 3);
    assert.equal(c.data.paymentMode, "mock");
    const pre = await fetch(`${s.base}/api/orders`, { method: "OPTIONS", headers: { Origin: "http://localhost:3001", "Access-Control-Request-Method": "POST" } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get("access-control-max-age"), "7200");
    assert.equal(pre.headers.get("access-control-allow-origin"), "http://localhost:3001");
    const evil = await fetch(`${s.base}/health`, { headers: { Origin: "http://evil.example" } });
    assert.equal(evil.headers.get("access-control-allow-origin"), null);
    const nf = await api(s.base, "GET", "/nope");
    assert.equal(nf.status, 404);
    assert.equal(nf.json.ok, false);
    const bad = await fetch(`${s.base}/api/orders`, { method: "POST", body: "{not json", headers: { "Content-Type": "application/json" } });
    assert.equal(bad.status, 400);
    // resolve is limited to 10/min/IP
    let limited = 0;
    for (let i = 0; i < 14; i++) if ((await api(s.base, "GET", "/api/rooms/resolve?code=ABCDEF")).status === 429) limited++;
    assert.ok(limited >= 3, "resolve must be rate limited");
  } finally {
    await s.stop();
  }
});
