import crypto from "node:crypto";
import type { App } from "./app.js";
import { createAiJob, jobView } from "./ai.js";
import { HttpError } from "./http.js";
import { verifyJwt } from "./jwt.js";
import { checkOrderToken, createOrder, getOrder, mockPay, orderView, tripayWebhook } from "./payments.js";
import type { IceRes } from "./protocol.js";
import { AI_ADDON_PRICE, AI_STYLES, PACKAGES, ROOM_FRAME_IDS } from "./protocol.js";
import { addVariant, authResult, deleteResult, getResult, presignUpload, resultView } from "./results.js";
import { createGameRoom, joinRoom, requireRoomOpen, resolveCode, summary } from "./rooms.js";

export function registerRoutes(app: App): void {
  const r = app.router;
  const hostKey = (c: { header(n: string): string | undefined }) => c.header("x-host-key");

  r.get("/health", () => ({ ok: true }));
  r.get("/api/time", () => ({ now: Date.now() }));
  r.get("/api/catalog", () => ({
    packages: PACKAGES, frames: ROOM_FRAME_IDS, aiStyles: AI_STYLES, aiAddonPrice: AI_ADDON_PRICE, paymentMode: app.cfg.paymentMode,
  }));

  // orders & payments
  r.post("/api/orders", async (c) => createOrder(app, await c.json()), { limit: { name: "order", capacity: 10, perSec: 10 / 60 } });
  r.get("/api/orders/:id", (c) => {
    const o = getOrder(app, c.params.id);
    checkOrderToken(app, o.id, c.query.get("t"));
    return orderView(app, o);
  });
  r.post("/api/orders/:id/mock-pay", (c) => mockPay(app, c));
  r.post("/api/payments/tripay/webhook", (c) => tripayWebhook(app, c));

  // rooms
  r.get("/api/rooms/resolve", (c) => resolveCode(app, c.query.get("code") ?? ""), {
    limit: { name: "resolve", capacity: 10, perSec: 10 / 60 },
  });
  r.get("/api/rooms/:id", (c) => {
    const room = app.store.rooms.get(c.params.id);
    if (!room) throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
    return summary(room);
  });
  r.post("/api/rooms/:id/join", async (c) => joinRoom(app, c.params.id, await c.json()), {
    limit: { name: "join", capacity: 30, perSec: 30 / 60 },
  });
  r.post("/api/game-rooms", async (c) => createGameRoom(app, await c.json()), { limit: { name: "game", capacity: 10, perSec: 10 / 60 } });

  r.get("/api/ice", (c): IceRes => {
    const auth = c.header("authorization") ?? "";
    const p = verifyJwt(auth.replace(/^Bearer\s+/i, ""), app.cfg.jwtSecret);
    if (!p) throw new HttpError(401, "UNAUTHORIZED", "Invalid join token");
    const iceServers: IceRes["iceServers"] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
    const ttl = 600;
    if (app.cfg.turnUrls.length && app.cfg.turnSecret) {
      const username = `${Math.floor(Date.now() / 1000) + ttl}:${String(p.deviceId).slice(0, 32)}`;
      const credential = crypto.createHmac("sha1", app.cfg.turnSecret).update(username).digest("base64");
      iceServers.push({ urls: app.cfg.turnUrls, username, credential });
    }
    return { iceServers, ttl };
  });

  // results & AI
  r.get("/api/results/:id", (c) => resultView(app, getResult(app, c.params.id)));
  r.post("/api/results/:id/uploads", async (c) => presignUpload(app, c.params.id, hostKey(c), await c.json()), {
    limit: { name: "upl", capacity: 30, perSec: 0.5 },
  });
  r.post("/api/results/:id/ai", async (c) => {
    authResult(app, c.params.id, hostKey(c));
    return createAiJob(app, c.params.id, await c.json());
  }, { limit: { name: "ai", capacity: 10, perSec: 10 / 60 } });
  r.get("/api/ai/jobs/:jobId", (c) => {
    const j = app.store.aiJobs.get(c.params.jobId);
    if (!j) throw new HttpError(404, "NOT_FOUND", "Job not found");
    return jobView(app, j);
  });
  r.post("/api/results/:id/variants", async (c) => addVariant(app, c.params.id, hostKey(c), await c.json()));
  r.del("/api/results/:id", (c) => deleteResult(app, c.params.id, hostKey(c)));

  // local file storage
  if (app.storage.handleFile) {
    const h = (c: Parameters<NonNullable<typeof app.storage.handleFile>>[0]) => app.storage.handleFile!(c);
    r.get("/files/*key", h);
    r.add("HEAD", "/files/*key", h);
    r.add("PUT", "/files/*key", h, { stream: true });
  }
  void requireRoomOpen;
}
