"use client";

import { HUB_URL } from "./hub-client";
import type {
  AiJobReq, AiJobRes, AiStyle, CreateGameRoomReq, CreateGameRoomRes, CreateOrderReq, CreateOrderRes,
  ErrorCode, IceRes, JoinReq, JoinRes, OrderRes, Package, ResultRes, RoomFrameId, RoomKind, RoomSummary,
} from "./protocol";

export type ApiErrorCode = ErrorCode | "NETWORK" | "BAD_RESPONSE" | "NOT_FOUND" | "ORDER_NOT_FOUND";

/** Thrown for every failed hub call. `code` is the hub error code, or NETWORK / BAD_RESPONSE client-side. */
export class RoomApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status = 0) {
    super(message);
    this.name = "RoomApiError";
  }
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is RoomApiError {
  return e instanceof RoomApiError && (!code || e.code === code);
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof RoomApiError) {
    if (e.code === "NETWORK") return "Can't reach the room service. Check your connection and try again.";
    if (e.code === "RATE_LIMIT") return "Too many attempts. Wait a moment and try again.";
    return e.message || fallback;
  }
  return e instanceof Error && e.message ? e.message : fallback;
}

// ---------- host key storage ----------
const HOST_KEY_PREFIX = "aibox-room-host:";

export function saveHostKey(roomId: string, hostKey: string) {
  try {
    localStorage.setItem(HOST_KEY_PREFIX + roomId, hostKey);
  } catch {
    /* private mode / blocked storage */
  }
}

export function getHostKey(roomId: string): string | null {
  try {
    return localStorage.getItem(HOST_KEY_PREFIX + roomId);
  } catch {
    return null;
  }
}

export function forgetHostKey(roomId: string) {
  try {
    localStorage.removeItem(HOST_KEY_PREFIX + roomId);
  } catch {
    /* ignore */
  }
}

/** Extracts `k` from a hostLink like `https://app/room/<id>?k=<hostKey>`. */
export function hostKeyFromLink(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link, "http://x").searchParams.get("k");
  } catch {
    return null;
  }
}

// ---------- core request ----------
type ReqOpts = { method?: string; body?: unknown; hostKey?: string | null; bearer?: string; query?: Record<string, string | undefined>; signal?: AbortSignal };

async function request<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const url = new URL(HUB_URL + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.hostKey) headers["x-host-key"] = opts.hostKey;
  if (opts.bearer) headers["authorization"] = `Bearer ${opts.bearer}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new RoomApiError("NETWORK", "Can't reach the room service.");
  }
  let json: { ok?: boolean; data?: T; error?: { code?: string; message?: string } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!json || typeof json.ok !== "boolean") {
    throw new RoomApiError("BAD_RESPONSE", `Unexpected response from the room service (${res.status}).`, res.status);
  }
  if (!json.ok) {
    throw new RoomApiError((json.error?.code as ApiErrorCode) ?? "INTERNAL", json.error?.message ?? "Request failed.", res.status);
  }
  return json.data as T;
}

// ---------- catalog / orders ----------
export type Catalog = {
  packages: Package[];
  frames: RoomFrameId[];
  aiStyles: AiStyle[];
  aiAddonPrice: number;
  paymentMode: "mock" | "tripay" | string;
};

export const getCatalog = (signal?: AbortSignal) => request<Catalog>("/api/catalog", { signal });
export const createOrder = (req: CreateOrderReq) => request<CreateOrderRes>("/api/orders", { body: req });
export const getOrder = (orderId: string, orderToken: string, signal?: AbortSignal) =>
  request<OrderRes>(`/api/orders/${encodeURIComponent(orderId)}`, { query: { t: orderToken }, signal });
export const mockPayOrder = (orderId: string, orderToken: string) =>
  request<OrderRes>(`/api/orders/${encodeURIComponent(orderId)}/mock-pay`, { method: "POST", query: { t: orderToken } });

// ---------- rooms ----------
export const resolveCode = (code: string) =>
  request<{ roomId: string; kind: RoomKind }>("/api/rooms/resolve", { query: { code: code.trim().toUpperCase() } });
export const getRoom = (roomId: string, signal?: AbortSignal) =>
  request<RoomSummary>(`/api/rooms/${encodeURIComponent(roomId)}`, { signal });
export const joinRoom = (roomId: string, req: JoinReq) =>
  request<JoinRes>(`/api/rooms/${encodeURIComponent(roomId)}/join`, { body: req });
export const getIce = (joinToken: string) => request<IceRes>("/api/ice", { bearer: joinToken });
export const createGameRoom = (req: CreateGameRoomReq) => request<CreateGameRoomRes>("/api/game-rooms", { body: req });

// ---------- results / AI ----------
export type PresignedUpload = { url: string; key: string; headers: Record<string, string>; expiresIn: number };

export const getResult = (resultId: string, signal?: AbortSignal) =>
  request<ResultRes>(`/api/results/${encodeURIComponent(resultId)}`, { signal });
export const requestUpload = (resultId: string, hostKey: string, purpose: "ai_input" | "variant") =>
  request<PresignedUpload>(`/api/results/${encodeURIComponent(resultId)}/uploads`, { body: { purpose }, hostKey });
export const startAiJob = (resultId: string, hostKey: string, req: AiJobReq) =>
  request<AiJobRes>(`/api/results/${encodeURIComponent(resultId)}/ai`, { body: req, hostKey });
export const getAiJob = (jobId: string, signal?: AbortSignal) =>
  request<AiJobRes>(`/api/ai/jobs/${encodeURIComponent(jobId)}`, { signal });
export const addVariant = (resultId: string, hostKey: string, body: { jobId: string; key: string }) =>
  request<ResultRes>(`/api/results/${encodeURIComponent(resultId)}/variants`, { body, hostKey });
export const deleteResult = (resultId: string, hostKey: string) =>
  request<{ deleted: true }>(`/api/results/${encodeURIComponent(resultId)}`, { method: "DELETE", hostKey });

/** PUT a blob to a presigned URL returned by the hub (local or R2). */
export async function putToPresigned(up: Pick<PresignedUpload, "url" | "headers">, blob: Blob): Promise<void> {
  let res: Response;
  try {
    const headers = new Headers();
    if (blob.type) headers.set("content-type", blob.type);
    for (const [k, v] of Object.entries(up.headers ?? {})) headers.set(k, v); // presigned headers win
    res = await fetch(up.url, { method: "PUT", headers, body: blob });
  } catch {
    throw new RoomApiError("NETWORK", "Upload failed. Check your connection and try again.");
  }
  if (!res.ok) throw new RoomApiError("INTERNAL", `Upload failed (${res.status}).`, res.status);
}
