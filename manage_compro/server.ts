import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { loadEnvFile } from "node:process";
import next from "next";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Load environment variables from .env.local before Next.js initializes.
try {
  loadEnvFile(".env.local");
} catch {
  // .env.local is optional; rely on system environment variables instead.
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// X-Forwarded-For is trusted only when the server sits behind a known reverse
// proxy (TRUST_PROXY=1). Otherwise a client could spoof the header and bypass
// the whitelist.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

const app = next({ dev });
const handle = app.getRequestHandler();

// ---------------------------------------------------------------------------
// IP helpers
// ---------------------------------------------------------------------------

// Collapse IPv4-mapped IPv6 addresses: "::ffff:127.0.0.1" -> "127.0.0.1".
function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function resolveClientIp(req: IncomingMessage): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return normalizeIp(forwarded.split(",")[0].trim());
    }
  }
  return normalizeIp(req.socket.remoteAddress ?? "unknown");
}

// ---------------------------------------------------------------------------
// Allowed IP sources
// ---------------------------------------------------------------------------

// Reads the whitelist from the database, returning null when the database is
// unreachable so the caller can fall back to less privileged sources.
async function fetchAllowedIpsFromDatabase(): Promise<string[] | null> {
  try {
    // Lazy import keeps .env.local (loaded above) applied before the shared
    // Prisma singleton in the library module is constructed.
    const { getAllowedIpsFromDb } = await import("./src/lib/allowed-ips");
    return await getAllowedIpsFromDb();
  } catch {
    return null;
  }
}

function parseEnvIps(): string[] {
  return (process.env.ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

// The whitelist is the union of database and environment entries. When the
// database is unavailable, fall back to environment entries, then to loopback.
async function getAllowedIps(): Promise<string[]> {
  const dbIps = await fetchAllowedIpsFromDatabase();
  if (dbIps === null) {
    const envIps = parseEnvIps();
    return envIps.length > 0 ? envIps : ["127.0.0.1", "::1"];
  }
  return [...new Set([...dbIps, ...parseEnvIps()])];
}

// ---------------------------------------------------------------------------
// IP whitelist guard
// ---------------------------------------------------------------------------

let cachedAllowedIps: string[] = [];
let requestCount = 0;
const REFRESH_INTERVAL = 10;

// Responds with 403 and returns true when the client IP is not allowed.
// The whitelist is refreshed periodically instead of on every request.
async function rejectBlockedIp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  requestCount += 1;

  if (requestCount % REFRESH_INTERVAL === 1) {
    cachedAllowedIps = await getAllowedIps();
  }

  const clientIp = resolveClientIp(req);
  if (cachedAllowedIps.includes(clientIp)) {
    return false;
  }

  res.writeHead(403, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: "Forbidden",
      message: `IP ${clientIp} is not allowed to access this resource.`,
    }),
  );
  return true;
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

app.prepare().then(() => {
  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const blocked = await rejectBlockedIp(req, res);
    if (!blocked) handle(req, res);
  }).listen(port, () => {
    console.log(
      `> manage_compro server listening at http://localhost:${port} [${dev ? "development" : "production"}]`,
    );
  });
});