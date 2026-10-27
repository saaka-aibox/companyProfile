import { hmacB64u, safeEqual } from "./util.js";

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

export type JwtPayload = { exp: number; iat: number; [k: string]: unknown };

/** HS256 JWT. ttlSec is relative to `nowMs`. */
export function signJwt(payload: Record<string, unknown>, secret: string, ttlSec: number, nowMs = Date.now()): string {
  const iat = Math.floor(nowMs / 1000);
  const head = enc({ alg: "HS256", typ: "JWT" });
  const body = enc({ ...payload, iat, exp: iat + ttlSec });
  return `${head}.${body}.${hmacB64u(secret, `${head}.${body}`)}`;
}

export function verifyJwt(token: unknown, secret: string, nowMs = Date.now()): JwtPayload | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  try {
    const head = JSON.parse(Buffer.from(h, "base64url").toString());
    if (head?.alg !== "HS256") return null;
    if (!safeEqual(s, hmacB64u(secret, `${h}.${b}`))) return null;
    const p = JSON.parse(Buffer.from(b, "base64url").toString()) as JwtPayload;
    if (typeof p.exp !== "number" || p.exp * 1000 <= nowMs) return null;
    return p;
  } catch {
    return null;
  }
}
