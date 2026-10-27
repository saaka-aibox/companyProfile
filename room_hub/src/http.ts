import type http from "node:http";
import type { Config } from "./config.js";
import { RateLimiter, log } from "./util.js";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export type Limit = { name: string; capacity: number; perSec: number };

export type Ctx = {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  ip: string;
  origin: string | undefined;
  header(name: string): string | undefined;
  /** JSON body (size limited). Empty body => {}. */
  json(): Promise<Record<string, unknown>>;
  /** Raw body as utf8 string (size limited). */
  rawBody(): Promise<string>;
  /** Send a custom response (skips the {ok,data} envelope). */
  send(status: number, payload: unknown, headers?: Record<string, string>): void;
  sent: boolean;
};

export type Handler = (c: Ctx) => Promise<unknown> | unknown;
type Route = { method: string; segs: string[]; handler: Handler; limit?: Limit; stream: boolean };

const BODY_LIMIT = 64 * 1024;

export function clientIp(req: http.IncomingMessage, trustProxy: number): string {
  const sock = req.socket.remoteAddress ?? "unknown";
  if (trustProxy > 0) {
    const xff = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    // trustProxy = number of proxy hops we control; the client is the Nth entry from the right.
    if (xff.length) return xff[Math.max(0, xff.length - trustProxy)] ?? sock;
  }
  return sock.replace(/^::ffff:/, "");
}

export class Router {
  private routes: Route[] = [];
  readonly limiter = new RateLimiter();

  constructor(private cfg: Config) {}

  add(method: string, pattern: string, handler: Handler, opts: { limit?: Limit; stream?: boolean } = {}): void {
    this.routes.push({ method, segs: pattern.split("/").filter(Boolean), handler, limit: opts.limit, stream: !!opts.stream });
  }
  get = (p: string, h: Handler, o?: { limit?: Limit }) => this.add("GET", p, h, o);
  post = (p: string, h: Handler, o?: { limit?: Limit }) => this.add("POST", p, h, o);
  del = (p: string, h: Handler, o?: { limit?: Limit }) => this.add("DELETE", p, h, o);

  private match(method: string, pathname: string): { route: Route; params: Record<string, string> } | "method" | null {
    const parts = pathname.split("/").filter(Boolean);
    let pathMatched = false;
    for (const r of this.routes) {
      const params: Record<string, string> = {};
      let ok = true;
      const wild = r.segs.length > 0 && r.segs[r.segs.length - 1].startsWith("*");
      if (wild ? parts.length < r.segs.length : parts.length !== r.segs.length) continue;
      for (let i = 0; i < r.segs.length; i++) {
        const s = r.segs[i];
        if (s.startsWith("*")) {
          params[s.slice(1)] = parts.slice(i).join("/");
          break;
        }
        if (s.startsWith(":")) params[s.slice(1)] = parts[i];
        else if (s !== parts[i]) { ok = false; break; }
      }
      if (!ok) continue;
      pathMatched = true;
      if (r.method === method) {
        for (const k of Object.keys(params)) {
          try { params[k] = decodeURIComponent(params[k]); } catch { return null; }
        }
        return { route: r, params };
      }
    }
    return pathMatched ? "method" : null;
  }

  private originAllowed(origin: string | undefined): boolean {
    if (!origin) return false;
    return this.cfg.allowedOrigins.includes("*") || this.cfg.allowedOrigins.includes(origin);
  }

  originOk(origin: string | undefined): boolean {
    return !origin || this.originAllowed(origin);
  }

  private cors(res: http.ServerResponse, origin: string | undefined, isFiles: boolean): void {
    if (isFiles) {
      // Signed URLs are capabilities; any origin may fetch them (canvas must not be tainted).
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    } else if (this.originAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin!);
      res.setHeader("Vary", "Origin");
    }
  }

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const origin = req.headers.origin;
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://x");
    } catch {
      res.statusCode = 400;
      res.end();
      return;
    }
    const isFiles = url.pathname.startsWith("/files/");
    this.cors(res, origin, isFiles);
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-host-key, X-Callback-Signature");
      res.setHeader("Access-Control-Max-Age", "7200");
      res.statusCode = 204;
      res.end();
      return;
    }

    const ip = clientIp(req, this.cfg.trustProxy);
    let sent = false;
    let bodyCache: Buffer | null = null;
    const send = (status: number, payload: unknown, headers: Record<string, string> = {}) => {
      if (sent) return;
      sent = true;
      const body = JSON.stringify(payload);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (!isFiles) res.setHeader("Cache-Control", "no-store");
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      res.end(body);
    };
    const fail = (e: HttpError) => send(e.status, { ok: false, error: { code: e.code, message: e.message } });

    try {
      if (!this.limiter.take(`g:${ip}`, 200, 40)) throw new HttpError(429, "RATE_LIMIT", "Too many requests");

      const m = this.match(req.method ?? "GET", url.pathname);
      if (m === null) throw new HttpError(404, "NOT_FOUND", "Not found");
      if (m === "method") throw new HttpError(405, "BAD_REQUEST", "Method not allowed");
      const { route, params } = m;
      if (route.limit && !this.limiter.take(`${route.limit.name}:${ip}`, route.limit.capacity, route.limit.perSec)) {
        throw new HttpError(429, "RATE_LIMIT", "Too many requests, slow down");
      }

      const readBody = async (): Promise<Buffer> => {
        if (bodyCache) return bodyCache;
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          size += (chunk as Buffer).length;
          if (size > BODY_LIMIT) throw new HttpError(413, "BAD_REQUEST", "Body too large");
          chunks.push(chunk as Buffer);
        }
        bodyCache = Buffer.concat(chunks);
        return bodyCache;
      };

      const ctx: Ctx = {
        req, res, url, params, query: url.searchParams, ip, origin,
        header: (n) => {
          const v = req.headers[n.toLowerCase()];
          return Array.isArray(v) ? v[0] : v;
        },
        rawBody: async () => (await readBody()).toString("utf8"),
        json: async () => {
          const raw = (await readBody()).toString("utf8");
          if (!raw.trim()) return {};
          try {
            const v = JSON.parse(raw);
            if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not object");
            return v as Record<string, unknown>;
          } catch {
            throw new HttpError(400, "BAD_REQUEST", "Invalid JSON body");
          }
        },
        send,
        get sent() { return sent; },
        set sent(v: boolean) { sent = v; },
      };
      const out = await route.handler(ctx);
      if (!sent && !res.writableEnded) {
        if (out === undefined) send(200, { ok: true, data: {} });
        else send(200, { ok: true, data: out });
      }
    } catch (e) {
      if (e instanceof HttpError) {
        if (!sent && !res.headersSent) fail(e);
        else res.end();
      } else {
        log("http: unhandled error", req.method, req.url, e);
        if (!sent && !res.headersSent) fail(new HttpError(500, "INTERNAL", "Internal error"));
        else res.end();
      }
    }
  }
}
