import path from "node:path";
import {
  COUNTDOWN_LEAD_MS, COUNTDOWN_MS, GAME_ROOM_TTL_MS, ORDER_TTL_MS, PEACE_STABLE_MS, RESULT_TTL_MS,
  ROOM_OPEN_TTL_MS, ROUND_COLLECT_TIMEOUT_MS, SESSION_LIMIT_MS, UPLOAD_MAX_BYTES,
} from "./protocol.js";

export type Config = {
  port: number;
  jwtSecret: string;
  allowedOrigins: string[];
  appUrl: string;
  publicHubUrl: string;
  trustProxy: number;
  paymentMode: "mock" | "tripay";
  tripay: { apiKey: string; privateKey: string; merchantCode: string; sandbox: boolean; method: string };
  storage: "local" | "r2";
  r2: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBase: string };
  falKey: string;
  falStyleEndpoint: string;
  turnUrls: string[];
  turnSecret: string;
  dataDir: string;
  uploadMaxBytes: number;
  timing: {
    countdownMs: number; leadMs: number; collectTimeoutMs: number; peaceStableMs: number; autoTimerMs: number;
    hostGraceMs: number; sessionLimitMs: number; heartbeatMs: number; idleMs: number; orderTtlMs: number;
    roomOpenTtlMs: number; resultTtlMs: number; gameRoomTtlMs: number; jobsIntervalMs: number;
    aiMockDelayMs: number; aiPollMs: number; aiTimeoutMs: number;
  };
};

type Env = Record<string, string | undefined>;
const DEV_SECRET = "dev-insecure-secret-change-me";

function num(env: Env, key: string, def: number): number {
  const v = env[key];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
const bool = (v: string | undefined, def: boolean) => (v === undefined || v === "" ? def : /^(1|true|yes)$/i.test(v));
const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const trimSlash = (s: string) => s.replace(/\/+$/, "");

export function loadConfig(env: Env = process.env): Config {
  let jwtSecret = env.JWT_SECRET ?? "";
  if (!jwtSecret) {
    if (env.NODE_ENV === "production") throw new Error("JWT_SECRET is required in production");
    jwtSecret = DEV_SECRET;
    if (!env.ROOM_HUB_QUIET) console.warn("[room_hub] WARNING: JWT_SECRET not set, using an insecure dev default.");
  }
  const origins = list(env.ALLOWED_ORIGINS);
  const tp = (env.TRUST_PROXY ?? "").toLowerCase();
  const trustProxy = tp === "true" ? 1 : /^\d+$/.test(tp) ? Number(tp) : 0;
  return {
    port: num(env, "PORT", 3011),
    jwtSecret,
    allowedOrigins: origins.length ? origins : ["http://localhost:3001"],
    appUrl: trimSlash(env.APP_URL || "http://localhost:3001"),
    publicHubUrl: trimSlash(env.PUBLIC_HUB_URL || "http://localhost:3011"),
    trustProxy,
    paymentMode: env.PAYMENT_MODE === "tripay" ? "tripay" : "mock",
    tripay: {
      apiKey: env.TRIPAY_API_KEY ?? "",
      privateKey: env.TRIPAY_PRIVATE_KEY ?? "",
      merchantCode: env.TRIPAY_MERCHANT_CODE ?? "",
      sandbox: bool(env.TRIPAY_SANDBOX, true),
      method: env.TRIPAY_METHOD || "QRIS",
    },
    storage: env.STORAGE === "r2" ? "r2" : "local",
    r2: {
      accountId: env.R2_ACCOUNT_ID ?? "",
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
      bucket: env.R2_BUCKET ?? "",
      publicBase: trimSlash(env.R2_PUBLIC_BASE ?? ""),
    },
    falKey: env.FAL_KEY ?? "",
    falStyleEndpoint: (env.FAL_STYLE_ENDPOINT || "fal-ai/flux-pro/kontext").replace(/^\/+|\/+$/g, ""),
    turnUrls: list(env.TURN_URLS),
    turnSecret: env.TURN_SECRET ?? "",
    dataDir: path.resolve(env.DATA_DIR || "./data"),
    uploadMaxBytes: num(env, "UPLOAD_MAX_BYTES", UPLOAD_MAX_BYTES),
    timing: {
      countdownMs: num(env, "COUNTDOWN_MS", COUNTDOWN_MS),
      leadMs: num(env, "COUNTDOWN_LEAD_MS", COUNTDOWN_LEAD_MS),
      collectTimeoutMs: num(env, "ROUND_COLLECT_TIMEOUT_MS", ROUND_COLLECT_TIMEOUT_MS),
      peaceStableMs: num(env, "PEACE_STABLE_MS", PEACE_STABLE_MS),
      autoTimerMs: num(env, "AUTO_TIMER_MS", 5000),
      hostGraceMs: num(env, "HOST_GRACE_MS", 3 * 60 * 1000),
      sessionLimitMs: num(env, "SESSION_LIMIT_MS", SESSION_LIMIT_MS),
      heartbeatMs: num(env, "HEARTBEAT_MS", 15000),
      idleMs: num(env, "IDLE_TIMEOUT_MS", 45000),
      orderTtlMs: num(env, "ORDER_TTL_MS", ORDER_TTL_MS),
      roomOpenTtlMs: num(env, "ROOM_OPEN_TTL_MS", ROOM_OPEN_TTL_MS),
      resultTtlMs: num(env, "RESULT_TTL_MS", RESULT_TTL_MS),
      gameRoomTtlMs: num(env, "GAME_ROOM_TTL_MS", GAME_ROOM_TTL_MS),
      jobsIntervalMs: num(env, "JOBS_INTERVAL_MS", 60000),
      aiMockDelayMs: num(env, "AI_MOCK_DELAY_MS", 1500),
      aiPollMs: num(env, "AI_POLL_MS", 2000),
      aiTimeoutMs: num(env, "AI_TIMEOUT_MS", 120000),
    },
  };
}
