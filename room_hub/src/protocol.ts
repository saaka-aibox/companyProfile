// Shared contract between room_hub (server) and aibox_v1 (client).
// KEEP IN SYNC: an identical copy lives at aibox_v1/src/lib/room/protocol.ts.
// Any change here must be mirrored there (additive changes only).

// ---------- limits & timings ----------
export const MAX_DEVICES = 4;
export const ROUNDS = 4; // one group tile per photostrip shot (STRIP_SHOT_COUNT)
export const RETAKES_PER_ROUND = 3;
export const COUNTDOWN_MS = 3000;
export const COUNTDOWN_LEAD_MS = 500; // delivery slack added on top of the countdown
export const ROUND_COLLECT_TIMEOUT_MS = 8000;
export const SESSION_LIMIT_MS = 20 * 60 * 1000;
export const ORDER_TTL_MS = 15 * 60 * 1000;
export const ROOM_OPEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const GAME_ROOM_TTL_MS = 30 * 60 * 1000;
export const PEACE_STABLE_MS = 600;
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

// ---------- catalog ----------
export type PackageId = "duo" | "squad" | "squad_ai";
export type Package = { id: PackageId; name: string; price: number; maxDevices: number; aiCredits: number; blurb: string };
export const PACKAGES: readonly Package[] = [
  { id: "duo", name: "Room Duo", price: 15000, maxDevices: 2, aiCredits: 0, blurb: "Two devices, one shared photostrip." },
  { id: "squad", name: "Room Squad", price: 25000, maxDevices: 4, aiCredits: 0, blurb: "Up to four devices in one photostrip." },
  { id: "squad_ai", name: "Room Squad AI", price: 39000, maxDevices: 4, aiCredits: 1, blurb: "Squad plus one AI style for the whole strip." },
];
export const AI_ADDON_PRICE = 10000;
/** Frame ids must exist in aibox_v1 `captureFrames` (components/landing/playground/visitor-photostrip.ts). */
export const ROOM_FRAME_IDS = ["songs", "wedding"] as const;
export type RoomFrameId = (typeof ROOM_FRAME_IDS)[number];
export const AI_STYLES = ["ghibli", "pixar", "retro90s", "cyberpunk", "manga", "oil"] as const;
export type AiStyle = (typeof AI_STYLES)[number];
export const GAME_IDS = ["suit-arena", "irisan-buah", "kode-komando", "tepuk-sinkron"] as const;
export type GameId = (typeof GAME_IDS)[number];

// ---------- domain ----------
export type OrderStatus = "UNPAID" | "PAID" | "EXPIRED" | "REFUNDED";
export type RoomKind = "photo" | "game";
export type RoomStatus = "pending_payment" | "open" | "in_session" | "completed" | "abandoned" | "cancelled";
export type Role = "host" | "guest";
export type Trigger = "manual" | "timer" | "peace";
export type Quorum = "all" | "majority" | "host";
export type SessionPhase =
  | "lobby" | "pose_ready" | "countdown" | "collecting" | "reviewing" | "composing" | "completed";

export type Peer = { id: string; name: string; slot: number; role: Role; connected: boolean; ready: boolean; peace: boolean };

export type SessionState = {
  phase: SessionPhase;
  round: number; // 0-based, < ROUNDS
  attempt: number; // retake attempt for the current round, starts at 0
  retakesLeft: number;
  trigger: Trigger;
  quorum: Quorum;
  /** accepted stills per round: slot -> object key */
  accepted: Record<number, Record<number, string>>;
  sessionEndsAt: number | null;
};

export type RoomSummary = {
  id: string;
  kind: RoomKind;
  status: RoomStatus;
  packageId: PackageId | null;
  frameId: RoomFrameId | null;
  gameId: GameId | null;
  maxDevices: number;
  joinCode: string;
  aiCreditsLeft: number;
  resultId: string | null;
};

// ---------- WebSocket messages ----------
// Every message is JSON: { type, ...payload }. Server stamps `serverNow` where noted.
export type ClientMsg =
  | { type: "hello"; token: string; deviceName: string; caps: { mp: boolean } }
  | { type: "ping"; t: number }
  | { type: "signal"; to: string; data: unknown } // SDP / ICE, relayed verbatim
  | { type: "ready"; on: boolean }
  | { type: "gesture"; peace: boolean }
  | { type: "settings"; trigger?: Trigger; quorum?: Quorum } // host only
  | { type: "start_round" } // host only (or timer/peace quorum on the server)
  | { type: "upload_req"; round: number; attempt: number }
  | { type: "captured"; round: number; attempt: number; key: string; w: number; h: number; bytes: number }
  | { type: "review"; round: number; action: "accept" | "retake" } // host only
  | { type: "compose_req" } // host asks for a presigned PUT for final.jpg + thumb
  | { type: "compose_done"; finalKey: string; thumbKey: string } // host only
  | { type: "stats"; rtt: number; relay: boolean; outKbps: number; fps: number }
  // games (kind = "game")
  | { type: "game_ready"; on: boolean }
  | { type: "game_start" } // host only
  | { type: "game_input"; data: unknown; tCapture: number } // relayed with server receive time
  | { type: "game_pose"; data: unknown; seq: number } // ~15 Hz hand landmarks, relayed, never stored
  | { type: "game_commit"; round: number; hash: string } // commit-reveal (suit arena)
  | { type: "game_reveal"; round: number; choice: string; salt: string }
  | { type: "game_score"; score: number; final?: boolean };

export type ServerMsg =
  | { type: "welcome"; you: string; slot: number; role: Role; peers: Peer[]; room: RoomSummary; session: SessionState | null; serverNow: number }
  | { type: "pong"; t: number; serverNow: number }
  | { type: "peer_join"; peer: Peer }
  | { type: "peer_leave"; id: string }
  | { type: "peer_update"; peer: Peer }
  | { type: "signal"; from: string; data: unknown }
  | { type: "state"; session: SessionState; room: RoomSummary }
  | { type: "peace"; counts: Record<string, boolean>; needed: number; have: number }
  | { type: "countdown"; round: number; attempt: number; shootAt: number; seconds: number }
  | { type: "upload_url"; round: number; attempt: number; url: string; key: string; headers: Record<string, string>; expiresIn: number }
  | { type: "round_ready"; round: number; attempt: number; stills: { slot: number; key: string; url: string }[]; missing: number[] }
  | { type: "compose_url"; final: { url: string; key: string; headers: Record<string, string> }; thumb: { url: string; key: string; headers: Record<string, string> } }
  | { type: "completed"; resultId: string; resultUrl: string }
  | { type: "error"; code: ErrorCode; message: string }
  // games
  | { type: "game_state"; phase: "lobby" | "countdown" | "playing" | "ended"; seed: number; startAt: number | null; ready: Record<string, boolean> }
  | { type: "game_input"; from: string; data: unknown; tCapture: number; tServer: number }
  | { type: "game_pose"; from: string; data: unknown; seq: number }
  | { type: "game_commit"; from: string; round: number }
  | { type: "game_reveal"; from: string; round: number; choice: string; valid: boolean }
  | { type: "game_score"; from: string; score: number; final?: boolean };

export type ErrorCode =
  | "BAD_REQUEST" | "UNAUTHORIZED" | "ROOM_FULL" | "ROOM_COMPLETED" | "ROOM_NOT_FOUND" | "NOT_HOST"
  | "RATE_LIMIT" | "INVALID_STATE" | "PAYMENT_REQUIRED" | "INTERNAL";

// ---------- HTTP DTOs (see room_hub/CONTRACT.md) ----------
export type CreateOrderReq = { kind: "room"; packageId: PackageId; frameId: RoomFrameId } | { kind: "ai_addon"; resultId: string };
export type CreateOrderRes = { orderId: string; orderToken: string; amount: number; qrString: string; expiresAt: number; mock: boolean };
export type OrderRes = { status: OrderStatus; kind: "room" | "ai_addon"; roomId: string | null; hostLink: string | null; resultId: string | null };
export type JoinReq = { name: string; deviceId: string; hostKey?: string };
export type JoinRes = { joinToken: string; slot: number; role: Role; wsUrl: string; room: RoomSummary };
export type IceRes = { iceServers: { urls: string | string[]; username?: string; credential?: string }[]; ttl: number };
export type ResultRes = {
  id: string; roomId: string; frameId: RoomFrameId; createdAt: number; deleteAt: number;
  finalUrl: string; thumbUrl: string; stills: { round: number; slot: number; url: string }[];
  variants: { id: string; style: AiStyle; url: string; createdAt: number }[];
  aiCreditsLeft: number;
};
export type AiJobReq = { style: AiStyle; inputKey: string }; // inputKey = uploaded grid image of the 4 tiles
export type AiJobRes = { jobId: string; status: "queued" | "running" | "done" | "failed"; outputUrl: string | null; error: string | null; mock: boolean };
export type CreateGameRoomReq = { gameId: GameId };
export type CreateGameRoomRes = { roomId: string; joinCode: string; hostKey: string; expiresAt: number };
