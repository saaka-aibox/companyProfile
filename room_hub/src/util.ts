import crypto from "node:crypto";

export const randId = (bytes = 16): string => crypto.randomBytes(bytes).toString("base64url");
export const sha256hex = (s: string | Buffer): string => crypto.createHash("sha256").update(s).digest("hex");
export const hmacHex = (key: string | Buffer, data: string | Buffer): string =>
  crypto.createHmac("sha256", key).update(data).digest("hex");
export const hmacB64u = (key: string | Buffer, data: string | Buffer): string =>
  crypto.createHmac("sha256", key).update(data).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; ts: number }>();
  /** Token bucket. Returns true when the call is allowed. */
  take(key: string, capacity: number, perSec: number, now = Date.now()): boolean {
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: capacity, ts: now };
      this.buckets.set(key, b);
    }
    b.tokens = Math.min(capacity, b.tokens + ((now - b.ts) / 1000) * perSec);
    b.ts = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
  prune(maxIdleMs = 10 * 60 * 1000, now = Date.now()): void {
    for (const [k, b] of this.buckets) if (now - b.ts > maxIdleMs) this.buckets.delete(k);
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function log(...a: unknown[]): void {
  if (process.env.ROOM_HUB_QUIET) return;
  console.log(new Date().toISOString(), ...a);
}
