import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config.js";
import { HttpError, type Ctx } from "./http.js";
import { hmacB64u, hmacHex, safeEqual, sha256hex } from "./util.js";

export const ALLOWED_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;
export type HeadInfo = { size: number; contentType: string };
export type FetchFn = typeof fetch;

export interface Storage {
  mode: "local" | "r2";
  presignPut(key: string, contentType: string, expiresSec: number): { url: string; headers: Record<string, string> };
  presignGet(key: string, expiresSec: number): string;
  head(key: string): Promise<HeadInfo | null>;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  /** Delete known keys (and, for local storage, the whole rooms/<id> directory). */
  deleteRoomFiles(roomId: string, keys: string[]): Promise<void>;
  /** Local-only: HTTP handler for /files/*. */
  handleFile?(c: Ctx): Promise<unknown>;
}

export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,300}$/;
export function validKey(key: string): boolean {
  return KEY_RE.test(key) && !key.includes("..") && !key.includes("//") && !key.endsWith("/");
}
const extType = (key: string): string => {
  const e = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return e === "webp" ? "image/webp" : e === "png" ? "image/png" : "image/jpeg";
};
const encKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/* ------------------------------------------------------------------ keys */
export const Keys = {
  still: (roomId: string, round: number, attempt: number, slot: number) => `rooms/${roomId}/r${round}/a${attempt}/s${slot}.jpg`,
  final: (roomId: string) => `rooms/${roomId}/final.jpg`,
  thumb: (roomId: string) => `rooms/${roomId}/thumb.webp`,
  aiInput: (roomId: string, jobId: string) => `rooms/${roomId}/ai/${jobId}-input.jpg`,
  aiOutput: (roomId: string, jobId: string) => `rooms/${roomId}/ai/${jobId}-output.jpg`,
  variant: (roomId: string, id: string) => `rooms/${roomId}/variant-${id}.jpg`,
};

/* ----------------------------------------------------------------- local */
export class LocalStorage implements Storage {
  mode = "local" as const;
  private root: string;
  private secret: string;
  constructor(private cfg: Config) {
    this.root = path.join(cfg.dataDir, "files");
    fs.mkdirSync(this.root, { recursive: true });
    this.secret = crypto.createHmac("sha256", cfg.jwtSecret).update("files-v1").digest("hex");
  }

  sign(method: string, key: string, exp: number, ct: string): string {
    return hmacB64u(this.secret, `${method}\n${key}\n${exp}\n${ct}`);
  }

  private abs(key: string): string {
    if (!validKey(key)) throw new Error("bad key");
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error("bad key");
    return p;
  }

  presignPut(key: string, contentType: string, expiresSec: number) {
    const exp = Math.floor(Date.now() / 1000) + expiresSec;
    const sig = this.sign("PUT", key, exp, contentType);
    const url = `${this.cfg.publicHubUrl}/files/${encKey(key)}?exp=${exp}&ct=${encodeURIComponent(contentType)}&sig=${sig}`;
    return { url, headers: { "Content-Type": contentType } };
  }
  presignGet(key: string, expiresSec: number): string {
    const exp = Math.floor(Date.now() / 1000) + expiresSec;
    return `${this.cfg.publicHubUrl}/files/${encKey(key)}?exp=${exp}&sig=${this.sign("GET", key, exp, "")}`;
  }
  async head(key: string): Promise<HeadInfo | null> {
    try {
      const st = await fs.promises.stat(this.abs(key));
      return st.isFile() ? { size: st.size, contentType: extType(key) } : null;
    } catch {
      return null;
    }
  }
  async put(key: string, data: Buffer): Promise<void> {
    const p = this.abs(key);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    const tmp = `${p}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.promises.writeFile(tmp, data);
    await fs.promises.rename(tmp, p);
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(this.abs(key));
    } catch {
      return null;
    }
  }
  async deleteRoomFiles(roomId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]+$/.test(roomId)) return;
    await fs.promises.rm(path.join(this.root, "rooms", roomId), { recursive: true, force: true });
  }

  async handleFile(c: Ctx): Promise<unknown> {
    const key = c.params.key;
    const method = c.req.method ?? "GET";
    if (!validKey(key)) throw new HttpError(400, "BAD_REQUEST", "Bad key");
    const exp = Number(c.query.get("exp"));
    const sig = c.query.get("sig") ?? "";
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) throw new HttpError(403, "UNAUTHORIZED", "Link expired");
    if (method === "PUT") {
      const ct = c.query.get("ct") ?? "";
      if (!safeEqual(sig, this.sign("PUT", key, exp, ct))) throw new HttpError(403, "UNAUTHORIZED", "Bad signature");
      const reqCt = (c.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!(ALLOWED_TYPES as readonly string[]).includes(ct) || reqCt !== ct) {
        throw new HttpError(415, "BAD_REQUEST", "Content-Type must be image/jpeg, image/webp or image/png and match the signed type");
      }
      const declared = Number(c.header("content-length") ?? 0);
      if (declared > this.cfg.uploadMaxBytes) throw new HttpError(413, "BAD_REQUEST", "File too large");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of c.req) {
        size += (chunk as Buffer).length;
        if (size > this.cfg.uploadMaxBytes) throw new HttpError(413, "BAD_REQUEST", "File too large");
        chunks.push(chunk as Buffer);
      }
      if (size === 0) throw new HttpError(400, "BAD_REQUEST", "Empty body");
      await this.put(key, Buffer.concat(chunks));
      return { key, size };
    }
    if (method === "GET" || method === "HEAD") {
      if (!safeEqual(sig, this.sign("GET", key, exp, ""))) throw new HttpError(403, "UNAUTHORIZED", "Bad signature");
      const info = await this.head(key);
      if (!info) throw new HttpError(404, "NOT_FOUND", "No such file");
      c.sent = true; // we write the response ourselves
      c.res.statusCode = 200;
      c.res.setHeader("Content-Type", info.contentType);
      c.res.setHeader("Content-Length", String(info.size));
      c.res.setHeader("Cache-Control", "private, max-age=300");
      if (method === "HEAD") {
        c.res.end();
      } else {
        const rs = fs.createReadStream(this.abs(key));
        rs.on("error", () => c.res.destroy());
        rs.pipe(c.res);
      }
      return undefined;
    }
    throw new HttpError(405, "BAD_REQUEST", "Method not allowed");
  }
}

/* -------------------------------------------------------------------- r2 */
const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase());

export class R2Storage implements Storage {
  mode = "r2" as const;
  private host: string;
  private region = "auto";
  constructor(private cfg: Config, private fetchFn: FetchFn = fetch) {
    const r = cfg.r2;
    if (!r.accountId || !r.accessKeyId || !r.secretAccessKey || !r.bucket) {
      throw new Error("STORAGE=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET");
    }
    this.host = `${r.accountId}.r2.cloudflarestorage.com`;
  }

  private canonicalUri(key: string): string {
    return `/${this.cfg.r2.bucket}/${key.split("/").map(rfc3986).join("/")}`;
  }
  private signingKey(date: string): Buffer {
    const h = (k: Buffer | string, d: string) => crypto.createHmac("sha256", k).update(d).digest();
    return h(h(h(h("AWS4" + this.cfg.r2.secretAccessKey, date), this.region), "s3"), "aws4_request");
  }
  private stamp(now = new Date()) {
    const amz = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return { amz, date: amz.slice(0, 8) };
  }

  /** Query-string SigV4 (presigned URL). Exposed for tests. */
  presign(method: "GET" | "PUT", key: string, expiresSec: number, contentType?: string, now = new Date()): string {
    const { amz, date } = this.stamp(now);
    const scope = `${date}/${this.region}/s3/aws4_request`;
    const signedHeaders = contentType ? "content-type;host" : "host";
    const q: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.cfg.r2.accessKeyId}/${scope}`,
      "X-Amz-Date": amz,
      "X-Amz-Expires": String(expiresSec),
      "X-Amz-SignedHeaders": signedHeaders,
    };
    const canonQuery = Object.keys(q).sort().map((k) => `${rfc3986(k)}=${rfc3986(q[k])}`).join("&");
    const canonHeaders = (contentType ? `content-type:${contentType}\n` : "") + `host:${this.host}\n`;
    const canonReq = [method, this.canonicalUri(key), canonQuery, canonHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
    const sts = ["AWS4-HMAC-SHA256", amz, scope, sha256hex(canonReq)].join("\n");
    const sig = hmacHex(this.signingKey(date), sts);
    return `https://${this.host}${this.canonicalUri(key)}?${canonQuery}&X-Amz-Signature=${sig}`;
  }

  presignPut(key: string, contentType: string, expiresSec: number) {
    return { url: this.presign("PUT", key, expiresSec, contentType), headers: { "Content-Type": contentType } };
  }
  presignGet(key: string, expiresSec: number): string {
    if (this.cfg.r2.publicBase) return `${this.cfg.r2.publicBase}/${encKey(key)}`;
    return this.presign("GET", key, expiresSec);
  }

  /** Header-signed server-side request. */
  private async call(method: string, key: string, body?: Buffer, contentType?: string): Promise<Response> {
    const { amz, date } = this.stamp();
    const scope = `${date}/${this.region}/s3/aws4_request`;
    const payloadHash = sha256hex(body ?? Buffer.alloc(0));
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonHeaders = `host:${this.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
    const canonReq = [method, this.canonicalUri(key), "", canonHeaders, signedHeaders, payloadHash].join("\n");
    const sts = ["AWS4-HMAC-SHA256", amz, scope, sha256hex(canonReq)].join("\n");
    const sig = hmacHex(this.signingKey(date), sts);
    const headers: Record<string, string> = {
      "x-amz-date": amz,
      "x-amz-content-sha256": payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.cfg.r2.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    };
    if (contentType) headers["Content-Type"] = contentType;
    return this.fetchFn(`https://${this.host}${this.canonicalUri(key)}`, {
      method, headers, body: body ? new Uint8Array(body) : undefined, signal: AbortSignal.timeout(20000),
    });
  }

  async head(key: string): Promise<HeadInfo | null> {
    const r = await this.call("HEAD", key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`r2 head ${r.status}`);
    return { size: Number(r.headers.get("content-length") ?? 0), contentType: (r.headers.get("content-type") ?? "").split(";")[0] };
  }
  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const r = await this.call("PUT", key, data, contentType);
    if (!r.ok) throw new Error(`r2 put ${r.status}`);
  }
  async get(key: string): Promise<Buffer | null> {
    const r = await this.call("GET", key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`r2 get ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  async deleteRoomFiles(_roomId: string, keys: string[]): Promise<void> {
    for (const k of keys) {
      try { await this.call("DELETE", k); } catch { /* lifecycle rule is the backstop */ }
    }
  }
}

export function createStorage(cfg: Config, fetchFn?: FetchFn): Storage {
  return cfg.storage === "r2" ? new R2Storage(cfg, fetchFn) : new LocalStorage(cfg);
}
