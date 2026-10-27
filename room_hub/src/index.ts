import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { log } from "./util.js";

// Optional .env support (Node 22+): no dependency needed.
try { process.loadEnvFile?.(".env"); } catch { /* no .env file */ }

const cfg = loadConfig();
const app = createApp(cfg);
const port = await app.listen();
log(`room_hub listening on :${port} (payments=${cfg.paymentMode}, storage=${cfg.storage}, ai=${cfg.falKey ? "fal" : "mock"})`);

const stop = async () => {
  log("shutting down");
  await app.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
