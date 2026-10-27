import http from "node:http";
import { startAiLoop } from "./ai.js";
import type { Config } from "./config.js";
import { Router } from "./http.js";
import { startJobs } from "./jobs.js";
import { registerRoutes } from "./routes.js";
import { createStorage, type FetchFn, type Storage } from "./storage.js";
import { Store } from "./store.js";
import { Hub } from "./ws.js";

export interface App {
  cfg: Config;
  store: Store;
  storage: Storage;
  router: Router;
  hub: Hub;
  fetchFn: FetchFn;
  server: http.Server;
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}

export function createApp(cfg: Config, deps: { fetch?: FetchFn } = {}): App {
  const fetchFn = deps.fetch ?? fetch;
  const store = new Store(cfg.dataDir);
  store.load();
  const storage = createStorage(cfg, fetchFn);
  const router = new Router(cfg);
  const server = http.createServer((req, res) => {
    void router.handle(req, res);
  });
  const app = { cfg, store, storage, router, fetchFn, server } as App;
  app.hub = new Hub(app);
  app.hub.attach(server);
  registerRoutes(app);

  const timers: NodeJS.Timeout[] = [];
  app.listen = (port = cfg.port) =>
    new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => {
        timers.push(startAiLoop(app), startJobs(app));
        const addr = server.address();
        resolve(typeof addr === "object" && addr ? addr.port : port);
      });
    });
  app.close = async () => {
    timers.forEach(clearInterval);
    app.hub.shutdown();
    server.closeAllConnections?.();
    await new Promise<void>((r) => server.close(() => r()));
    await store.flush();
  };
  return app;
}
