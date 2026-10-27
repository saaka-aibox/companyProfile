# room_hub

Backend for AI Box Room (online photobox, max 4 devices) and the AI hand games.
One light Node process: WebSocket session engine + order / payment / join / result / AI HTTP API.
Persistence is a local JSON file, so the Next.js site can stay static-friendly on Vercel.

- Contract: `CONTRACT.md` and `src/protocol.ts` (identical copy in `aibox_v1/src/lib/room/protocol.ts`).
- Stack: Node 22+, TypeScript via `tsx`, `node:http`, `ws`. JWT, HMAC and AWS SigV4 are hand-rolled on `node:crypto`.

## Run

```bash
cd room_hub
npm install
cp .env.example .env      # optional, .env is loaded automatically
npm run dev               # tsx watch, http://localhost:3011
npm run start             # no watch
npm run typecheck
npm test                  # node --test via tsx (13 tests, about 7 s)
```

Quick check:

```bash
curl localhost:3011/health
curl localhost:3011/api/catalog
```

Default dev flow (all mock, no external services): `POST /api/orders` -> `POST /api/orders/:id/mock-pay?t=<orderToken>` -> `hostLink` -> join -> WebSocket `/ws`.

## Modes

| Env | Values | Notes |
|---|---|---|
| `PAYMENT_MODE` | `mock` (default), `tripay` | `mock-pay` only exists in mock mode. Tripay needs `TRIPAY_API_KEY`, `TRIPAY_PRIVATE_KEY`, `TRIPAY_MERCHANT_CODE`; `TRIPAY_SANDBOX=true` uses `api-sandbox`. Webhook URL: `PUBLIC_HUB_URL/api/payments/tripay/webhook`. |
| `STORAGE` | `local` (default), `r2` | local: files under `DATA_DIR/files`, HMAC-signed `PUT/GET /files/<key>`. r2: SigV4 presigned URLs (set `R2_*`; `R2_PUBLIC_BASE` makes GET urls public CDN urls). |
| `FAL_KEY` | empty = mock AI | Mock copies the input as output after 1.5 s (`mock:true`). With a key, jobs go through `queue.fal.run` (`FAL_STYLE_ENDPOINT`). On localhost the input is inlined as a data URI because fal cannot reach localhost. |
| `TRUST_PROXY` | `0` (default), `true`/`1`, or N | Number of reverse-proxy hops to trust for `X-Forwarded-For`. Set to 1 behind Caddy. |

See `.env.example` for every variable. Timings (`COUNTDOWN_MS`, `PEACE_STABLE_MS`, `HOST_GRACE_MS`, ...) can be overridden by env; defaults come from `protocol.ts`.

## Layout

```
src/
  index.ts      entry (loads .env, starts server, graceful shutdown)
  app.ts        wiring: store, storage, router, ws hub, background loops
  config.ts     env parsing
  protocol.ts   shared contract (do not rename things)
  http.ts       tiny router, CORS, envelope, token-bucket rate limiting, TRUST_PROXY
  routes.ts     all HTTP endpoints
  store.ts      in-memory maps + debounced atomic JSON persistence (DATA_DIR/db.json)
  jwt.ts util.ts
  payments.ts   mock + Tripay (QRIS create, HMAC webhook, idempotent)
  rooms.ts      room creation, join codes, join tokens, slots
  storage.ts    local signed files + R2 SigV4
  ws.ts         WebSocket session engine (photo flow + games)
  ai.ts         fal queue / mock jobs, style prompts, credits
  results.ts    result, uploads, variants, delete
  jobs.ts       housekeeping every minute
test/           node --test suites
```

## Deploy notes (VPS)

- Run behind Caddy/nginx with TLS and WebSocket upgrade; set `PUBLIC_HUB_URL=https://...`, `TRUST_PROXY=1`, `ALLOWED_ORIGINS=https://your-site`, `JWT_SECRET=<long random>` (required when `NODE_ENV=production`).
- `DATA_DIR` holds `db.json` (orders, rooms, results, AI jobs, credit notes) and local files. Back it up.
- Room session state (current round, accepted stills) lives in memory only; after a restart rooms are still joinable but a running session restarts from the lobby.
