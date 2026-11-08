# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`room_hub` is the backend for **AI Box Room**: a paid online photobox (a Zoom-style "room" of up to 4 devices that take a synchronized group photo and compose one shared photostrip) plus free AI hand-game rooms. It is one Node 22 process (`node:http` + `ws`, TypeScript run via `tsx`, no build step) and runs on a VPS, not Vercel. The only runtime dependency is `ws`; JWT, HMAC and AWS SigV4 are hand-rolled on `node:crypto`.

It is one of three apps in the `companyProfile` repo (`aibox_v1` = Next.js public site + the room/games client UI, `manage_compro` = separate CMS). The `aibox_v1/CLAUDE.md` describes the CMS "engine" philosophy and does **not** apply to this service.

## Commands

```bash
npm install
cp .env.example .env     # optional; .env is loaded automatically
npm run dev              # tsx watch, http://localhost:3011
npm run start            # no watch
npm run typecheck        # tsc --noEmit
npm test                 # node --import tsx --test "test/*.test.ts"
node --import tsx --test test/photo.test.ts                  # single file
node --import tsx --test --test-name-pattern="<name>" test/*.test.ts   # single test
```

Default env is fully mocked (`PAYMENT_MODE=mock`, `STORAGE=local`, empty `FAL_KEY`), so no external service is needed. Dev flow: `POST /api/orders` -> `POST /api/orders/:id/mock-pay?t=<orderToken>` -> `hostLink` -> `POST /api/rooms/:id/join` -> WebSocket `/ws`. To exercise the full stack, also run `aibox_v1` (`npm run dev`, port 3001, routes `/room` and `/games`); set `NEXT_PUBLIC_ROOM_HUB_URL` there if the hub is not on 3011.

## Architecture

- `src/app.ts` wires everything: `Store`, `Storage`, `Router`, `Hub` (WebSocket) and two background loops (`ai.ts` job polling, `jobs.ts` minute housekeeping). `createApp(cfg, {fetch})` takes an injectable `fetch` so tests can fake Tripay/fal/R2; see `test/helpers.ts` for the harness.
- `src/routes.ts` registers all HTTP endpoints on the tiny router in `src/http.ts` (CORS, `{ok,data}` / `{ok:false,error}` envelope, token-bucket rate limits, `TRUST_PROXY` for `X-Forwarded-For`). Business logic lives in `rooms.ts`, `payments.ts`, `results.ts`, `ai.ts`, not in routes.
- `src/store.ts` is the only persistence: in-memory maps with debounced atomic writes to `DATA_DIR/db.json` (orders, rooms, results, AI jobs, credit notes).
- **Room session state is memory only** (`RoomRt` in `ws.ts`): current round, accepted stills and timers are lost on restart. Rooms stay joinable but a running session restarts from the lobby. Do not assume it is persisted.
- `src/ws.ts` (about 790 lines) is the session engine, a state machine over `SessionPhase`: `lobby -> pose_ready -> countdown -> collecting -> reviewing -> composing -> completed`. Photo rounds are triggered by host (`manual`), server timer (`timer`) or a hand-gesture quorum (`peace`, stable for 600 ms). Games share the same socket (`game_*` messages, relay-only; Suit Arena uses server-verified commit-reveal `sha256(choice:salt)`).
- **Clock sync is central**: the server sends `countdown { shootAt }` in server time and every client shoots at that instant (`atServerTime` in `aibox_v1/src/lib/room/hub-client.ts`). Photos and the final composite never pass through the server socket; clients PUT them to presigned URLs (`upload_url`, `compose_url`) and the server only verifies the objects (`final` must exceed 50 KB) at `compose_done`.
- Video/audio is peer-to-peer WebRTC; the server only relays `signal` messages and serves `/api/ice`. The peer with the lexicographically smaller id initiates the offer. TURN is optional (`TURN_URLS`/`TURN_SECRET`).
- Auth: an `orderToken` (query `t`) for orders, a `hostKey` (`x-host-key`) for result mutations, and a `joinToken` JWT for `/ws` and `/api/ice`. Reconnecting with the same `deviceId` returns the same slot. When the room completes, all sockets are closed and tokens revoked (later joins get `ROOM_COMPLETED`).
- `storage.ts` has two backends behind one interface: `local` (HMAC-signed `PUT/GET /files/<key>`) and `r2` (SigV4 presigned URLs). `ai.ts` mocks AI (copies input after 1.5 s) when `FAL_KEY` is empty; with a key it uses fal's queue, and on localhost it inlines inputs as data URIs because fal cannot reach localhost.

## Shared contract (keep in sync)

`src/protocol.ts` defines every constant, timing, message type and DTO, and has an **identical copy at `../aibox_v1/src/lib/room/protocol.ts`**. Change both together and keep changes additive (the file's own header says so). `CONTRACT.md` (in Indonesian) documents the HTTP endpoints and the photo-session sequence; update it when endpoints or message flow change. Frame ids in `ROOM_FRAME_IDS` must exist in `aibox_v1`'s `captureFrames` (`components/landing/playground/visitor-photostrip.ts`). Timings (`COUNTDOWN_MS`, `PEACE_STABLE_MS`, `HOST_GRACE_MS`, ...) default from `protocol.ts` and can be overridden by env, which tests rely on to run fast.

## Production notes

`JWT_SECRET` is required when `NODE_ENV=production`. Run behind Caddy/nginx with TLS and WebSocket upgrade, `TRUST_PROXY=1`, and set `PUBLIC_HUB_URL`, `APP_URL`, `ALLOWED_ORIGINS`. The Tripay webhook is `PUBLIC_HUB_URL/api/payments/tripay/webhook` (HMAC `X-Callback-Signature`, idempotent). `DATA_DIR` holds `db.json` and local files and needs backups.
