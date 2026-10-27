import { HUB_URL } from "./hub-client";
import type { ErrorCode, IceRes, JoinReq, JoinRes, RoomSummary } from "./protocol";

/** Minimal local HTTP helpers for the room session UI (typed per room_hub/CONTRACT.md). */
export class HubHttpError extends Error {
  constructor(public code: ErrorCode | "NETWORK", message: string, public status = 0) {
    super(message);
  }
}

async function hub<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${HUB_URL}${path}`, init);
  } catch {
    throw new HubHttpError("NETWORK", "Could not reach the room server. Check your connection and try again.");
  }
  let body: { ok?: boolean; data?: T; error?: { code: ErrorCode; message: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !body?.ok) {
    throw new HubHttpError(body?.error?.code ?? "INTERNAL", body?.error?.message ?? `Request failed (${res.status}).`, res.status);
  }
  return body.data as T;
}

export const fetchRoomSummary = (roomId: string) => hub<RoomSummary>(`/api/rooms/${encodeURIComponent(roomId)}`);

export const joinRoom = (roomId: string, req: JoinReq) =>
  hub<JoinRes>(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });

export const fetchIce = (joinToken: string) => hub<IceRes>("/api/ice", { headers: { authorization: `Bearer ${joinToken}` } });

/** Presigned PUT (local storage mode or R2). */
export async function putObject(url: string, blob: Blob, headers: Record<string, string>) {
  const res = await fetch(url, { method: "PUT", headers, body: blob });
  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
}
