process.env.ROOM_HUB_QUIET = "1";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { createApp, type App } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FetchFn } from "../src/storage.js";

export type Started = { app: App; base: string; port: number; stop: () => Promise<void> };

export async function startApp(env: Record<string, string> = {}, deps: { fetch?: FetchFn } = {}): Promise<Started> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "room-hub-test-"));
  const cfg = loadConfig({
    ROOM_HUB_QUIET: "1",
    JWT_SECRET: "test-secret-test-secret",
    DATA_DIR: dir,
    COUNTDOWN_MS: "150",
    COUNTDOWN_LEAD_MS: "50",
    ROUND_COLLECT_TIMEOUT_MS: "2500",
    PEACE_STABLE_MS: "120",
    AI_MOCK_DELAY_MS: "300",
    ...env,
  });
  const app = createApp(cfg, deps);
  const port = await app.listen(0);
  cfg.publicHubUrl = `http://127.0.0.1:${port}`;
  return {
    app, port, base: cfg.publicHubUrl,
    stop: async () => {
      await app.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function api(base: string, method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: any = await r.json().catch(() => null);
  return { status: r.status, json, data: json?.data, error: json?.error };
}

export function fakeJpeg(bytes: number): Buffer {
  const b = Buffer.alloc(bytes, 0x5a);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff;
  return b;
}

export class WsClient {
  ws: WebSocket;
  msgs: any[] = [];
  closeCode: number | null = null;
  private waiters: { pred: (m: any) => boolean; res: (m: any) => void }[] = [];
  private closeWaiters: ((c: number) => void)[] = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (d) => {
      const m = JSON.parse(d.toString());
      this.msgs.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (w.pred(m)) { w.res(m); return false; }
        return true;
      });
    });
    this.ws.on("close", (code) => {
      this.closeCode = code;
      this.closeWaiters.forEach((f) => f(code));
    });
  }
  open(): Promise<void> {
    return new Promise((res, rej) => {
      this.ws.once("open", () => res());
      this.ws.once("error", rej);
    });
  }
  send(m: unknown): void { this.ws.send(JSON.stringify(m)); }
  /** Resolves with the first not-yet-consumed matching message (history included, then consumed). */
  waitFor<T = any>(type: string, pred: (m: any) => boolean = () => true, timeoutMs = 8000): Promise<T> {
    const test = (m: any) => m.type === type && pred(m);
    const i = this.msgs.findIndex(test);
    if (i >= 0) return Promise.resolve(this.msgs.splice(i, 1)[0]);
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`timeout waiting for ${type}; got ${this.msgs.map((m) => m.type).join(",")}`)), timeoutMs);
      this.waiters.push({
        pred: test,
        res: (m) => {
          clearTimeout(t);
          const k = this.msgs.indexOf(m);
          if (k >= 0) this.msgs.splice(k, 1);
          res(m);
        },
      });
    });
  }
  waitClose(timeoutMs = 5000): Promise<number> {
    if (this.closeCode !== null) return Promise.resolve(this.closeCode);
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("timeout waiting for close")), timeoutMs);
      this.closeWaiters.push((c) => { clearTimeout(t); res(c); });
    });
  }
  has(type: string): boolean { return this.msgs.some((m) => m.type === type); }
  close(): void { try { this.ws.close(); } catch { /* ignore */ } }
}

export async function connectWs(wsUrl: string, token: string, name: string): Promise<WsClient> {
  const c = new WsClient(wsUrl);
  await c.open();
  c.send({ type: "hello", token, deviceName: name, caps: { mp: true } });
  return c;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pay a mock order and return { roomId, hostKey }. */
export async function buyRoom(base: string, packageId = "squad") {
  const o = await api(base, "POST", "/api/orders", { kind: "room", packageId, frameId: "songs" });
  if (!o.data) throw new Error("order failed " + JSON.stringify(o.json));
  const paid = await api(base, "POST", `/api/orders/${o.data.orderId}/mock-pay?t=${o.data.orderToken}`);
  const hostLink = new URL(paid.data.hostLink);
  return { orderId: o.data.orderId as string, roomId: paid.data.roomId as string, hostKey: hostLink.searchParams.get("k")! };
}

export async function joinAs(base: string, roomId: string, name: string, hostKey?: string) {
  const deviceId = "dev-" + name.toLowerCase().replace(/\W/g, "") + "-" + Math.random().toString(36).slice(2, 10);
  const r = await api(base, "POST", `/api/rooms/${roomId}/join`, { name, deviceId, hostKey });
  return { ...r, deviceId };
}
