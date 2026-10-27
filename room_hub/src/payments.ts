import crypto from "node:crypto";
import type { App } from "./app.js";
import { HttpError, type Ctx } from "./http.js";
import type { CreateOrderRes, OrderRes } from "./protocol.js";
import { AI_ADDON_PRICE, PACKAGES, ROOM_FRAME_IDS } from "./protocol.js";
import { createRoom } from "./rooms.js";
import { deriveHostKey } from "./rooms.js";
import type { OrderRec } from "./store.js";
import { hmacB64u, hmacHex, log, safeEqual } from "./util.js";

export const orderToken = (app: App, orderId: string): string => hmacB64u(app.cfg.jwtSecret, `order:${orderId}`).slice(0, 22);

export function checkOrderToken(app: App, orderId: string, token: string | null | undefined): void {
  if (!token || !safeEqual(token, orderToken(app, orderId))) throw new HttpError(401, "UNAUTHORIZED", "Invalid order token");
}

export function getOrder(app: App, id: string): OrderRec {
  const o = app.store.orders.get(id);
  if (!o) throw new HttpError(404, "NOT_FOUND", "Order not found");
  if (o.status === "UNPAID" && Date.now() > o.expiresAt) {
    o.status = "EXPIRED";
    app.store.save();
  }
  return o;
}

export function orderView(app: App, o: OrderRec): OrderRes {
  const paidRoom = o.kind === "room" && o.status === "PAID" && o.roomId;
  return {
    status: o.status,
    kind: o.kind,
    roomId: o.roomId,
    hostLink: paidRoom ? `${app.cfg.appUrl}/room/${o.roomId}?k=${deriveHostKey(app, o.roomId!)}` : null,
    resultId: o.resultId,
  };
}

export async function createOrder(app: App, body: Record<string, unknown>): Promise<CreateOrderRes> {
  const { cfg, store } = app;
  const kind = body.kind;
  let amount = 0;
  let packageId: OrderRec["packageId"] = null;
  let frameId: OrderRec["frameId"] = null;
  let resultId: string | null = null;
  let itemName = "";
  if (kind === "room") {
    const pkg = PACKAGES.find((p) => p.id === body.packageId);
    if (!pkg) throw new HttpError(400, "BAD_REQUEST", "Unknown packageId");
    if (!(ROOM_FRAME_IDS as readonly unknown[]).includes(body.frameId)) throw new HttpError(400, "BAD_REQUEST", "Unknown frameId");
    amount = pkg.price;
    packageId = pkg.id;
    frameId = body.frameId as OrderRec["frameId"];
    itemName = pkg.name;
  } else if (kind === "ai_addon") {
    const rid = typeof body.resultId === "string" ? body.resultId : "";
    if (!store.results.has(rid)) throw new HttpError(404, "NOT_FOUND", "Result not found");
    amount = AI_ADDON_PRICE;
    resultId = rid;
    itemName = "AI style add-on";
  } else {
    throw new HttpError(400, "BAD_REQUEST", "Unknown order kind");
  }

  const id = "ABX" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const now = Date.now();
  const o: OrderRec = {
    id, kind, packageId, frameId, resultId, amount, status: "UNPAID", createdAt: now,
    expiresAt: now + cfg.timing.orderTtlMs, paidAt: null, roomId: null, tripayRef: null, qrString: "",
    mock: cfg.paymentMode === "mock",
  };

  if (cfg.paymentMode === "mock") {
    o.qrString = `MOCK-QRIS-${id}`;
  } else {
    const t = cfg.tripay;
    if (!t.apiKey || !t.privateKey || !t.merchantCode) throw new HttpError(500, "INTERNAL", "Tripay is not configured");
    const base = t.sandbox ? "https://tripay.co.id/api-sandbox" : "https://tripay.co.id/api";
    const payload = {
      method: t.method,
      merchant_ref: id,
      amount,
      customer_name: "AI Box Room",
      customer_email: "room@aibox.id",
      order_items: [{ name: itemName, price: amount, quantity: 1 }],
      callback_url: `${cfg.publicHubUrl}/api/payments/tripay/webhook`,
      return_url: cfg.appUrl,
      expired_time: Math.floor(o.expiresAt / 1000),
      signature: hmacHex(t.privateKey, t.merchantCode + id + amount),
    };
    let json: any;
    try {
      const r = await app.fetchFn(`${base}/transaction/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      json = await r.json().catch(() => null);
    } catch (e) {
      log("tripay create failed", e);
      throw new HttpError(502, "INTERNAL", "Payment provider unreachable");
    }
    const qr = json?.data?.qr_string ?? json?.data?.qr_url;
    if (!json?.success || !qr) {
      log("tripay create rejected", json?.message);
      throw new HttpError(502, "INTERNAL", "Payment provider rejected the order");
    }
    o.qrString = String(qr);
    o.tripayRef = json.data.reference ? String(json.data.reference) : null;
  }

  store.orders.set(id, o);
  store.save();
  return { orderId: id, orderToken: orderToken(app, id), amount, qrString: o.qrString, expiresAt: o.expiresAt, mock: o.mock };
}

/** Idempotent: the first PAID creates the room / adds the credit, later calls are no-ops. */
export function markPaid(app: App, o: OrderRec): void {
  if (o.status === "PAID") return;
  if (o.status === "REFUNDED") return;
  o.status = "PAID";
  o.paidAt = Date.now();
  if (o.kind === "room") {
    const pkg = PACKAGES.find((p) => p.id === o.packageId)!;
    const { room } = createRoom(app, {
      kind: "photo", packageId: pkg.id, frameId: o.frameId ?? undefined, maxDevices: pkg.maxDevices,
      aiCredits: pkg.aiCredits, orderId: o.id,
    });
    o.roomId = room.id;
  } else {
    const result = o.resultId ? app.store.results.get(o.resultId) : undefined;
    const room = result ? app.store.rooms.get(result.roomId) : undefined;
    if (room) {
      room.aiCredits += 1;
      o.roomId = room.id;
    } else {
      log("ai_addon paid but result is gone", o.id);
    }
  }
  app.store.save();
  log(`order ${o.id} PAID (${o.kind})`);
}

export function mockPay(app: App, c: Ctx): OrderRes {
  if (app.cfg.paymentMode !== "mock") throw new HttpError(403, "UNAUTHORIZED", "mock-pay is disabled");
  const o = getOrder(app, c.params.id);
  checkOrderToken(app, o.id, c.query.get("t"));
  if (o.status === "EXPIRED") throw new HttpError(410, "INVALID_STATE", "Order expired");
  markPaid(app, o);
  return orderView(app, o);
}

export async function tripayWebhook(app: App, c: Ctx): Promise<void> {
  const key = app.cfg.tripay.privateKey;
  const raw = await c.rawBody();
  const given = (c.header("x-callback-signature") ?? "").toLowerCase();
  if (!key || !given || !safeEqual(given, hmacHex(key, raw))) {
    c.send(401, { success: false, message: "Invalid signature" });
    return;
  }
  const event = c.header("x-callback-event");
  if (event && event !== "payment_status") {
    c.send(200, { success: true });
    return;
  }
  let p: any;
  try {
    p = JSON.parse(raw);
  } catch {
    c.send(400, { success: false, message: "Bad JSON" });
    return;
  }
  const o = typeof p?.merchant_ref === "string" ? app.store.orders.get(p.merchant_ref) : undefined;
  if (!o) {
    c.send(404, { success: false, message: "Unknown order" });
    return;
  }
  if (p.total_amount !== undefined && Number(p.total_amount) !== o.amount) {
    log(`tripay webhook amount mismatch for ${o.id}`);
    c.send(400, { success: false, message: "Amount mismatch" });
    return;
  }
  if (p.status === "PAID") {
    if (p.reference && !o.tripayRef) o.tripayRef = String(p.reference);
    markPaid(app, o);
  } else if ((p.status === "EXPIRED" || p.status === "FAILED") && o.status === "UNPAID") {
    o.status = "EXPIRED";
    app.store.save();
  }
  c.send(200, { success: true });
}
