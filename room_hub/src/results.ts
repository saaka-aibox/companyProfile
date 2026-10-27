import type { App } from "./app.js";
import { HttpError } from "./http.js";
import type { AiStyle, ResultRes } from "./protocol.js";
import { verifyHostKey } from "./rooms.js";
import { Keys } from "./storage.js";
import type { ResultRec, RoomRec } from "./store.js";
import { randId } from "./util.js";

const GET_TTL = 3600;
const MAX_VARIANTS = 12;

export function resultView(app: App, r: ResultRec): ResultRes {
  const room = app.store.rooms.get(r.roomId);
  const get = (k: string) => app.storage.presignGet(k, GET_TTL);
  return {
    id: r.id, roomId: r.roomId, frameId: r.frameId, createdAt: r.createdAt, deleteAt: r.deleteAt,
    finalUrl: get(r.finalKey), thumbUrl: get(r.thumbKey),
    stills: r.stills.map((s) => ({ round: s.round, slot: s.slot, url: get(s.key) })),
    variants: r.variants.map((v) => ({ id: v.id, style: v.style, url: get(v.key), createdAt: v.createdAt })),
    aiCreditsLeft: room?.aiCredits ?? 0,
  };
}

export function getResult(app: App, id: string): ResultRec {
  const r = app.store.results.get(id);
  if (!r) throw new HttpError(404, "NOT_FOUND", "Result not found");
  return r;
}

/** Host-key guarded access: returns the result and its room. */
export function authResult(app: App, id: string, hostKey: string | undefined): { result: ResultRec; room: RoomRec } {
  const result = getResult(app, id);
  const room = app.store.rooms.get(result.roomId);
  if (!room || !verifyHostKey(room, hostKey)) throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid x-host-key");
  return { result, room };
}

export function presignUpload(app: App, id: string, hostKey: string | undefined, body: Record<string, unknown>) {
  const { result } = authResult(app, id, hostKey);
  let key: string;
  if (body.purpose === "ai_input") key = Keys.aiInput(result.roomId, randId(16));
  else if (body.purpose === "variant") key = Keys.variant(result.roomId, randId(12));
  else throw new HttpError(400, "BAD_REQUEST", "purpose must be ai_input or variant");
  const { url, headers } = app.storage.presignPut(key, "image/jpeg", 120);
  return { url, key, headers, expiresIn: 120 };
}

export async function addVariant(app: App, id: string, hostKey: string | undefined, body: Record<string, unknown>): Promise<ResultRes> {
  const { result } = authResult(app, id, hostKey);
  const job = typeof body.jobId === "string" ? app.store.aiJobs.get(body.jobId) : undefined;
  if (!job || job.resultId !== result.id) throw new HttpError(404, "NOT_FOUND", "AI job not found");
  if (job.status !== "done") throw new HttpError(409, "INVALID_STATE", "AI job is not done");
  const key = typeof body.key === "string" ? body.key : "";
  const m = new RegExp(`^rooms/${result.roomId}/variant-([A-Za-z0-9_-]{8,32})\\.jpg$`).exec(key);
  if (!m) throw new HttpError(400, "BAD_REQUEST", "key must come from POST /api/results/:id/uploads (variant)");
  if (result.variants.length >= MAX_VARIANTS) throw new HttpError(409, "INVALID_STATE", "Too many variants");
  const head = await app.storage.head(key);
  if (!head || head.size < 1) throw new HttpError(400, "BAD_REQUEST", "Variant has not been uploaded");
  if (!result.variants.some((v) => v.key === key)) {
    result.variants.push({ id: m[1], style: job.style as AiStyle, key, createdAt: Date.now() });
    app.store.save();
  }
  return resultView(app, result);
}

export async function deleteResultFiles(app: App, resultId: string): Promise<void> {
  const r = app.store.results.get(resultId);
  if (!r) return;
  const keys = [r.finalKey, r.thumbKey, ...r.stills.map((s) => s.key), ...r.variants.map((v) => v.key)];
  for (const j of [...app.store.aiJobs.values()]) {
    if (j.resultId === r.id) {
      keys.push(j.inputKey, j.outputKey);
      app.store.aiJobs.delete(j.id);
    }
  }
  await app.storage.deleteRoomFiles(r.roomId, keys).catch(() => undefined);
  app.store.results.delete(r.id);
  const room = app.store.rooms.get(r.roomId);
  if (room) {
    app.store.rooms.delete(room.id);
    app.store.codes.delete(room.joinCode);
  }
  app.store.save();
}

export async function deleteResult(app: App, id: string, hostKey: string | undefined) {
  authResult(app, id, hostKey);
  await deleteResultFiles(app, id);
  return { deleted: true };
}
