/** Small shared helpers for the AI Box Games (no DOM side effects at import time). */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Deterministic PRNG so two devices with the same seed see the same game. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Game time source. Local games use a pausable monotonic clock; remote games use the hub clock. */
export interface Clock {
  now(): number;
  pause(): void;
  resume(): void;
  readonly pausable: boolean;
}

export function localClock(): Clock {
  let pausedAt: number | null = null;
  let offset = 0;
  return {
    pausable: true,
    now: () => (pausedAt ?? performance.now()) - offset,
    pause() {
      if (pausedAt === null) pausedAt = performance.now();
    },
    resume() {
      if (pausedAt !== null) {
        offset += performance.now() - pausedAt;
        pausedAt = null;
      }
    },
  };
}

export function hubClock(now: () => number): Clock {
  return { pausable: false, now, pause() {}, resume() {} };
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt(bytes = 12): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function pickColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
