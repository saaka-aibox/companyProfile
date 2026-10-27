# room_hub: kontrak HTTP + WebSocket

Tipe ada di `src/protocol.ts`, dengan salinan identik di `aibox_v1/src/lib/room/protocol.ts`.
Basis URL dev: `http://localhost:3011`. Semua respons JSON berformat `{ ok: true, data }` atau `{ ok: false, error: { code, message } }`.
CORS: origin diizinkan dari env `ALLOWED_ORIGINS` (dipisah koma; default `http://localhost:3001`).

## Mode (env)
- `PAYMENT_MODE=mock|tripay`. Default `mock`: order dibuat dengan `qrString` palsu, lalu dibayar lewat `POST /api/orders/:id/mock-pay`.
- `STORAGE=local|r2`. Default `local`: file disimpan di `./data/files` dan diunggah dengan PUT bertoken ke `/files/*`.
- `FAL_KEY` kosong berarti AI berjalan dalam mode mock: output = input, dengan `mock:true`.
- `TURN_URLS`, `TURN_SECRET` (opsional). Tanpa TURN, ICE hanya memakai STUN publik.
- `JWT_SECRET`, `PUBLIC_HUB_URL` (dipakai untuk membangun URL file/ws), `APP_URL` (dipakai untuk link host/hasil, default `http://localhost:3001`).

## Endpoint
| Method dan path | Auth | Body / query | `data` |
|---|---|---|---|
| `GET /health` | — | — | `{ ok:true }` |
| `GET /api/time` | — | — | `{ now }` |
| `GET /api/catalog` | — | — | `{ packages, frames: ROOM_FRAME_IDS, aiStyles, aiAddonPrice, paymentMode }` |
| `POST /api/orders` | — | `CreateOrderReq` | `CreateOrderRes` |
| `GET /api/orders/:id?t=orderToken` | orderToken | — | `OrderRes` (`hostLink` = `${APP_URL}/room/${roomId}?k=${hostKey}` setelah PAID) |
| `POST /api/orders/:id/mock-pay?t=` | orderToken, mode mock | — | `OrderRes` |
| `POST /api/payments/tripay/webhook` | HMAC `X-Callback-Signature` | raw Tripay | `{ success:true }` (idempoten) |
| `GET /api/rooms/resolve?code=ABC123` | rate limit 10/menit/IP | — | `{ roomId, kind }` |
| `GET /api/rooms/:id` | — | — | `RoomSummary` (tanpa rahasia) |
| `POST /api/rooms/:id/join` | — | `JoinReq` | `JoinRes`, atau error `ROOM_FULL` / `ROOM_COMPLETED` / `ROOM_NOT_FOUND` / `PAYMENT_REQUIRED` |
| `GET /api/ice` | `Authorization: Bearer joinToken` | — | `IceRes` |
| `POST /api/game-rooms` | rate limit | `CreateGameRoomReq` | `CreateGameRoomRes` (gratis, TTL 30 menit) |
| `GET /api/results/:id` | — | — | `ResultRes` |
| `POST /api/results/:id/uploads` | header `x-host-key` | `{ purpose: "ai_input" \| "variant" }` | `{ url, key, headers, expiresIn }` (presigned PUT) |
| `POST /api/results/:id/ai` | `x-host-key` | `AiJobReq` | `AiJobRes` (memotong 1 kredit; tanpa kredit → `PAYMENT_REQUIRED`) |
| `GET /api/ai/jobs/:jobId` | — | — | `AiJobRes` (server mem-poll fal queue) |
| `POST /api/results/:id/variants` | `x-host-key` | `{ jobId, key }` (strip AI hasil susun ulang di klien) | `ResultRes` |
| `DELETE /api/results/:id` | `x-host-key` | — | `{ deleted:true }` (hak hapus pengguna) |
| `PUT /files/<key>?sig=…&exp=…` | tanda tangan HMAC | body gambar | 200 (hanya `STORAGE=local`) |
| `GET /files/<key>?sig=…&exp=…` | tanda tangan HMAC | — | file (hanya `STORAGE=local`) |

## WebSocket `GET /ws` (upgrade)
- Pesan pertama wajib `hello { token }` (joinToken). Server membalas `welcome`, dan pesan berikutnya sesuai `ClientMsg` / `ServerMsg`.
- Inisiator offer WebRTC adalah peer dengan `id` yang lebih kecil (perbandingan string). Server hanya merelai `signal`.
- **Alur sesi foto:**
  1. Host mengirim `start_round`. Mode `timer` (otomatis 5 detik setelah accept) dan `peace` (kuorum stabil 600 ms) juga memicu ronde dari server.
  2. Server mengirim `countdown { shootAt = now + COUNTDOWN_MS + COUNTDOWN_LEAD_MS }`.
  3. Klien memotret pada `shootAt` (jam server), lalu mengirim `upload_req`.
  4. Server membalas `upload_url`, dan klien melakukan PUT foto.
  5. Klien mengirim `captured`. Setelah semua foto masuk atau `ROUND_COLLECT_TIMEOUT_MS` habis, server mengirim `round_ready`.
  6. Host mengirim `review accept|retake` (`retake` mengurangi `retakesLeft`). `accept` pada ronde terakhir memindahkan fase ke `composing`.
  7. Host mengirim `compose_req`, dan server membalas `compose_url`.
  8. Host melakukan PUT `final.jpg` dan `thumb.webp`, lalu mengirim `compose_done`.
  9. Server memverifikasi objek (ada, `final` > 50 KB), lalu mengubah room ke `completed`, membuat result, mengirim broadcast `completed`, menutup semua socket, dan mencabut token. Join berikutnya ditolak dengan `ROOM_COMPLETED`.
- **Game room:** `game_ready`. Host mengirim `game_start`, lalu server mengirim `game_state` (countdown; seed + `startAt` = now + 3000). `game_input` dan `game_pose` direlai ke peer lain dengan `tServer`. `game_commit` dan `game_reveal` divalidasi server dengan `sha256(choice + ":" + salt) === hash`.
- Server mengirim ping heartbeat. Koneksi yang diam lebih dari 45 detik ditutup. Rate limit 40 pesan/detik per koneksi (`game_pose` 25/detik).
- Reconnect dengan `deviceId` yang sama mendapat slot yang sama.
