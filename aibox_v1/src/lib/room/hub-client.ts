"use client";

import type { ClientMsg, ServerMsg } from "./protocol";

/** Base URL of the room_hub service (HTTP + WebSocket). */
export const HUB_URL = (process.env.NEXT_PUBLIC_ROOM_HUB_URL || "http://localhost:3011").replace(/\/$/, "");
export const HUB_WS_URL = HUB_URL.replace(/^http/, "ws") + "/ws";

type Handler<T extends ServerMsg["type"]> = (msg: Extract<ServerMsg, { type: T }>) => void;
type Status = "connecting" | "open" | "closed";

/**
 * One WebSocket per device. Handles hello/token auth, reconnect with backoff + jitter,
 * and NTP-style clock sync (keeps the lowest-RTT sample) so every device can act on the
 * same server instant (`shootAt`, game `startAt`).
 */
export class HubClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<(msg: ServerMsg) => void>>();
  private statusHandlers = new Set<(s: Status) => void>();
  private retry = 0;
  private closedByUser = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private bestRtt = Infinity;
  /** serverNow ≈ Date.now() + offset */
  offset = 0;
  status: Status = "closed";

  constructor(private token: string, private deviceName: string, private caps: { mp: boolean } = { mp: false }) {}

  connect() {
    this.closedByUser = false;
    this.open();
  }

  /** Current server time in ms (clock-synced). */
  now() {
    return Date.now() + this.offset;
  }

  /** Local performance-clock deadline for a server timestamp. */
  localDelay(serverTs: number) {
    return serverTs - this.now();
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  on<T extends ServerMsg["type"]>(type: T, handler: Handler<T>) {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as (msg: ServerMsg) => void);
    return () => set!.delete(handler as (msg: ServerMsg) => void);
  }

  onStatus(handler: (s: Status) => void) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  close() {
    this.closedByUser = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close(1000, "bye");
    this.ws = null;
    this.setStatus("closed");
  }

  private setStatus(s: Status) {
    this.status = s;
    this.statusHandlers.forEach((h) => h(s));
  }

  private open() {
    this.setStatus("connecting");
    const ws = new WebSocket(HUB_WS_URL);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.bestRtt = Infinity;
      this.send({ type: "hello", token: this.token, deviceName: this.deviceName, caps: this.caps });
      this.setStatus("open");
      // 5 quick samples, then one every 30 s keeps the offset fresh.
      for (let i = 0; i < 5; i++) setTimeout(() => this.send({ type: "ping", t: Date.now() }), i * 150);
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ type: "ping", t: Date.now() }), 30_000);
    };
    ws.onmessage = (event) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.type === "pong") {
        const now = Date.now();
        const rtt = now - msg.t;
        if (rtt <= this.bestRtt) {
          this.bestRtt = rtt;
          this.offset = msg.serverNow - (msg.t + rtt / 2);
        }
      } else if (msg.type === "welcome") {
        if (!Number.isFinite(this.bestRtt)) this.offset = msg.serverNow - Date.now();
      }
      this.handlers.get(msg.type)?.forEach((h) => h(msg));
    };
    ws.onclose = (event) => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.ws = null;
      this.setStatus("closed");
      // 4000-4099: server said stop (completed room, bad token, room full). Do not retry.
      if (this.closedByUser || (event.code >= 4000 && event.code < 4100)) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++) * (0.7 + Math.random() * 0.6);
      setTimeout(() => !this.closedByUser && this.open(), delay);
    };
    ws.onerror = () => ws.close();
  }
}

/** Fire `fn` as close as possible to a server timestamp (setTimeout + rAF fine-tuning). */
export function atServerTime(client: HubClient, serverTs: number, fn: () => void) {
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    const left = client.localDelay(serverTs);
    if (left <= 4) fn();
    else if (left > 40) setTimeout(tick, left - 30);
    else requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelled = true;
  };
}

/** Stable per-browser device id (slot is kept on reconnect). */
export function deviceId() {
  try {
    const key = "aibox-room-device";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
