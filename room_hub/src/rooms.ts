import crypto from "node:crypto";
import type { App } from "./app.js";
import { HttpError } from "./http.js";
import { signJwt } from "./jwt.js";
import type {
  CreateGameRoomReq, CreateGameRoomRes, GameId, JoinReq, JoinRes, PackageId, Role, RoomFrameId, RoomSummary,
} from "./protocol.js";
import { GAME_IDS, MAX_DEVICES } from "./protocol.js";
import type { RoomRec } from "./store.js";
import { hmacB64u, randId, safeEqual, sha256hex } from "./util.js";

export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_TOKEN_TTL_SEC = 2 * 60 * 60;
/** A slot of a device that is not connected may be reclaimed after this long. */
const SLOT_RECLAIM_MS = 60_000;

/** hostKey is derived (128-bit) so the order page can rebuild the host link; only its sha256 is stored. */
export function deriveHostKey(app: App, roomId: string): string {
  return hmacB64u(app.cfg.jwtSecret, `hostkey:${roomId}`).slice(0, 22);
}

export function genJoinCode(app: App): string {
  for (let i = 0; i < 100; i++) {
    let code = "";
    for (let j = 0; j < 6; j++) code += JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)];
    if (!app.store.codes.has(code)) return code;
  }
  throw new Error("could not allocate join code");
}

export function summary(room: RoomRec): RoomSummary {
  return {
    id: room.id, kind: room.kind, status: room.status, packageId: room.packageId, frameId: room.frameId,
    gameId: room.gameId, maxDevices: room.maxDevices, joinCode: room.joinCode, aiCreditsLeft: room.aiCredits,
    resultId: room.resultId,
  };
}

export function createRoom(
  app: App,
  o: {
    kind: "photo" | "game"; packageId?: PackageId; frameId?: RoomFrameId; gameId?: GameId; maxDevices: number;
    aiCredits?: number; orderId?: string; expiresAt?: number | null;
  },
): { room: RoomRec; hostKey: string } {
  const id = randId(16);
  const hostKey = deriveHostKey(app, id);
  const now = Date.now();
  const room: RoomRec = {
    id, kind: o.kind, status: "open", packageId: o.packageId ?? null, frameId: o.frameId ?? null,
    gameId: o.gameId ?? null, maxDevices: Math.min(o.maxDevices, MAX_DEVICES), joinCode: genJoinCode(app),
    hostKeyHash: sha256hex(hostKey), hostDeviceId: null, orderId: o.orderId ?? null, aiCredits: o.aiCredits ?? 0,
    devices: {}, createdAt: now, openedAt: now, completedAt: null, expiresAt: o.expiresAt ?? null, resultId: null,
  };
  app.store.rooms.set(id, room);
  app.store.codes.set(room.joinCode, id);
  app.store.save();
  return { room, hostKey };
}

export function createGameRoom(app: App, body: Record<string, unknown>): CreateGameRoomRes {
  const req = body as Partial<CreateGameRoomReq>;
  if (!req.gameId || !(GAME_IDS as readonly string[]).includes(req.gameId)) {
    throw new HttpError(400, "BAD_REQUEST", "Unknown gameId");
  }
  const expiresAt = Date.now() + app.cfg.timing.gameRoomTtlMs;
  const { room, hostKey } = createRoom(app, { kind: "game", gameId: req.gameId, maxDevices: MAX_DEVICES, expiresAt });
  return { roomId: room.id, joinCode: room.joinCode, hostKey, expiresAt };
}

export function verifyHostKey(room: RoomRec, key: string | undefined): boolean {
  return !!key && key.length < 200 && safeEqual(sha256hex(key), room.hostKeyHash);
}

export function requireRoomOpen(room: RoomRec | undefined): RoomRec {
  if (!room) throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  if (room.status === "completed") throw new HttpError(410, "ROOM_COMPLETED", "This room has already finished");
  if (room.status === "pending_payment") throw new HttpError(402, "PAYMENT_REQUIRED", "Room is not paid yet");
  if (room.status === "abandoned" || room.status === "cancelled") throw new HttpError(404, "ROOM_NOT_FOUND", "Room is closed");
  return room;
}

export function resolveCode(app: App, codeRaw: string): { roomId: string; kind: string } {
  const code = codeRaw.trim().toUpperCase();
  const id = /^[A-Z0-9]{6}$/.test(code) ? app.store.codes.get(code) : undefined;
  const room = requireRoomOpen(id ? app.store.rooms.get(id) : undefined);
  return { roomId: room.id, kind: room.kind };
}

const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function joinRoom(app: App, roomId: string, body: Record<string, unknown>): JoinRes {
  const req = body as Partial<JoinReq>;
  const room = requireRoomOpen(app.store.rooms.get(roomId));
  if (typeof req.deviceId !== "string" || !DEVICE_RE.test(req.deviceId)) {
    throw new HttpError(400, "BAD_REQUEST", "deviceId must be 8-64 chars [A-Za-z0-9_-]");
  }
  const name = (typeof req.name === "string" ? req.name : "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) || "Guest";
  let isHost = false;
  if (req.hostKey !== undefined && req.hostKey !== "") {
    if (!verifyHostKey(room, String(req.hostKey))) throw new HttpError(401, "UNAUTHORIZED", "Invalid host key");
    isHost = true;
  }

  const now = Date.now();
  let dev = room.devices[req.deviceId];
  if (!dev) {
    const used = new Set(Object.values(room.devices).map((d) => d.slot));
    let slot = -1;
    for (let s = 0; s < room.maxDevices; s++) if (!used.has(s)) { slot = s; break; }
    if (slot < 0) {
      // Reclaim a slot from a device that has been gone for a while (never during an active hub connection).
      const stale = Object.entries(room.devices)
        .filter(([id, d]) => !app.hub?.isConnected(room.id, id) && now - d.lastSeen > SLOT_RECLAIM_MS && id !== room.hostDeviceId)
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
      if (!stale) throw new HttpError(409, "ROOM_FULL", `Room already has ${room.maxDevices} devices`);
      slot = stale[1].slot;
      delete room.devices[stale[0]];
    }
    dev = { name, slot, joinedAt: now, lastSeen: now };
    room.devices[req.deviceId] = dev;
  } else {
    dev.name = name;
    dev.lastSeen = now;
  }
  if (isHost) room.hostDeviceId = req.deviceId;
  app.store.save();

  const role: Role = room.hostDeviceId === req.deviceId ? "host" : "guest";
  const joinToken = signJwt({ roomId: room.id, deviceId: req.deviceId, role, slot: dev.slot }, app.cfg.jwtSecret, JOIN_TOKEN_TTL_SEC);
  const wsUrl = app.cfg.publicHubUrl.replace(/^http/, "ws") + "/ws";
  return { joinToken, slot: dev.slot, role, wsUrl, room: summary(room) };
}
