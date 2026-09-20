import { loadEnvFile } from "node:process";
import { createServer, IncomingMessage, ServerResponse } from "http";
import next from "next";

// Load environment variables from .env.local before Next.js initializes.
try {
  loadEnvFile(".env.local");
} catch {
  // .env.local is optional; rely on system environment variables instead.
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req: IncomingMessage, res: ServerResponse) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(
      `> aibox_v1 server listening at http://localhost:${port} [${dev ? "development" : "production"}]`,
    );
  });
});
