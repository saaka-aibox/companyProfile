import { HUB_URL, HubClient, atServerTime, deviceId } from "../room/hub-client";
import type {
  CreateGameRoomRes, GameId, JoinRes, Peer, RoomSummary, ServerMsg,
} from "../room/protocol";

export type GameStateMsg = Extract<ServerMsg, { type: "game_state" }>;
export type GameInputMsg = Extract<ServerMsg, { type: "game_input" }>;
export type GamePoseMsg = Extract<ServerMsg, { type: "game_pose" }>;
export type GameRevealMsg = Extract<ServerMsg, { type: "game_reveal" }>;
export type GameScoreMsg = Extract<ServerMsg, { type: "game_score" }>;

export class HubError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function hub<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(HUB_URL + path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new HubError("NETWORK", "The game server could not be reached. Check your connection and try again.");
  }
  let body: { ok?: boolean; data?: T; error?: { code: string; message: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* handled below */
  }
  if (!body?.ok) {
    const code = body?.error?.code ?? "INTERNAL";
    throw new HubError(code, friendlyHubError(code, body?.error?.message));
  }
  return body.data as T;
}

function friendlyHubError(code: string, fallback?: string) {
  switch (code) {
    case "ROOM_FULL": return "That room is full.";
    case "ROOM_NOT_FOUND": return "No room matches that code. Check it and try again.";
    case "ROOM_COMPLETED": return "That room has already finished.";
    case "RATE_LIMIT": return "Too many tries. Wait a moment and try again.";
    default: return fallback || "Something went wrong with the game server.";
  }
}

// ---------------------------------------------------------------- identity + links

export function playerName(): string {
  try {
    let n = localStorage.getItem("aibox-game-name");
    if (!n) {
      n = `Player ${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("aibox-game-name", n);
    }
    return n;
  } catch {
    return "Player";
  }
}
export function setPlayerName(name: string) {
  try {
    localStorage.setItem("aibox-game-name", name.trim().slice(0, 24) || "Player");
  } catch {
    /* private mode */
  }
}

const hostKeyStore = (roomId: string) => `aibox-game-host:${roomId}`;
function saveHostKey(roomId: string, key: string) {
  try { sessionStorage.setItem(hostKeyStore(roomId), key); } catch { /* ignore */ }
}
function loadHostKey(roomId: string): string | undefined {
  try { return sessionStorage.getItem(hostKeyStore(roomId)) ?? undefined; } catch { return undefined; }
}

export function gameShareLink(slug: GameId, roomId: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/games/${slug}?room=${encodeURIComponent(roomId)}`;
}

// ---------------------------------------------------------------- HTTP

/** POST /api/game-rooms, remembering the hostKey so this device rejoins as host. */
export async function createGameRoom(gameId: GameId): Promise<CreateGameRoomRes> {
  const room = await hub<CreateGameRoomRes>("/api/game-rooms", { method: "POST", body: JSON.stringify({ gameId }) });
  saveHostKey(room.roomId, room.hostKey);
  return room;
}

/** GET /api/rooms/resolve?code= */
export async function resolveJoinCode(code: string): Promise<{ roomId: string; kind: string }> {
  return hub(`/api/rooms/resolve?code=${encodeURIComponent(code.trim().toUpperCase())}`);
}

export async function getRoomSummary(roomId: string): Promise<RoomSummary> {
  return hub(`/api/rooms/${encodeURIComponent(roomId)}`);
}

/** POST /api/rooms/:id/join, then open the WebSocket through HubClient. */
export async function joinGameRoom(roomId: string, name = playerName()): Promise<GameNet> {
  const joined = await hub<JoinRes>(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: "POST",
    body: JSON.stringify({ name, deviceId: deviceId(), hostKey: loadHostKey(roomId) }),
  });
  return new GameNet(joined, name);
}

// ---------------------------------------------------------------- GameNet

type Status = "connecting" | "open" | "closed";
type Events = {
  peers: Peer[];
  state: GameStateMsg;
  input: GameInputMsg;
  pose: GamePoseMsg;
  commit: { from: string; round: number };
  reveal: GameRevealMsg;
  score: GameScoreMsg;
  status: Status;
  error: string;
};

/** Thin game-room wrapper over HubClient. Buffers early messages so late subscribers do not miss them. */
export class GameNet {
  readonly client: HubClient;
  readonly role: JoinRes["role"];
  readonly slot: number;
  readonly room: RoomSummary;
  you = "";
  peers: Peer[] = [];
  gameState: GameStateMsg | null = null;
  status: Status = "connecting";
  /** commit/reveal/score/input logs by sender, for messages that arrived before the game listened. */
  commits = new Map<string, Set<number>>();
  reveals = new Map<string, Map<number, GameRevealMsg>>();
  scores = new Map<string, GameScoreMsg>();
  inputLog: GameInputMsg[] = [];
  private subs: { [K in keyof Events]?: Set<(v: Events[K]) => void> } = {};
  private offs: (() => void)[] = [];

  constructor(join: JoinRes, public name: string) {
    this.role = join.role;
    this.slot = join.slot;
    this.room = join.room;
    this.client = new HubClient(join.joinToken, name, { mp: true });
    const c = this.client;
    this.offs.push(
      c.onStatus((s) => { this.status = s; this.emit("status", s); }),
      c.on("welcome", (m) => { this.you = m.you; this.peers = m.peers; this.emit("peers", this.peers); }),
      c.on("peer_join", (m) => { this.upsert(m.peer); }),
      c.on("peer_update", (m) => { this.upsert(m.peer); }),
      c.on("peer_leave", (m) => {
        this.peers = this.peers.map((p) => (p.id === m.id ? { ...p, connected: false, ready: false } : p));
        this.emit("peers", this.peers);
      }),
      c.on("game_state", (m) => { this.gameState = m; this.emit("state", m); }),
      c.on("game_input", (m) => { this.inputLog.push(m); if (this.inputLog.length > 400) this.inputLog.shift(); this.emit("input", m); }),
      c.on("game_pose", (m) => this.emit("pose", m)),
      c.on("game_commit", (m) => {
        const set = this.commits.get(m.from) ?? new Set<number>();
        set.add(m.round);
        this.commits.set(m.from, set);
        this.emit("commit", m);
      }),
      c.on("game_reveal", (m) => {
        const map = this.reveals.get(m.from) ?? new Map<number, GameRevealMsg>();
        map.set(m.round, m);
        this.reveals.set(m.from, map);
        this.emit("reveal", m);
      }),
      c.on("game_score", (m) => { this.scores.set(m.from, m); this.emit("score", m); }),
      c.on("error", (m) => this.emit("error", m.message)),
    );
    c.connect();
  }

  get isHost() {
    return this.role === "host";
  }
  /** Connected peers other than this device. */
  others() {
    return this.peers.filter((p) => p.id !== this.you && p.connected);
  }
  peerName(id: string) {
    return this.peers.find((p) => p.id === id)?.name ?? "Friend";
  }
  /** Server clock (ms). */
  now() {
    return this.client.now();
  }
  /** Run `fn` at a server timestamp (setTimeout + rAF fine tuning). */
  at(serverTs: number, fn: () => void) {
    return atServerTime(this.client, serverTs, fn);
  }

  private upsert(peer: Peer) {
    const i = this.peers.findIndex((p) => p.id === peer.id);
    if (i >= 0) this.peers = this.peers.map((p, k) => (k === i ? peer : p));
    else this.peers = [...this.peers, peer];
    this.emit("peers", this.peers);
  }

  on<K extends keyof Events>(event: K, fn: (v: Events[K]) => void) {
    const store = this.subs as Record<string, Set<unknown>>;
    const set = (store[event] ??= new Set()) as Set<(v: Events[K]) => void>;
    set.add(fn);
    return () => set.delete(fn);
  }
  private emit<K extends keyof Events>(event: K, value: Events[K]) {
    (this.subs[event] as Set<(v: Events[K]) => void> | undefined)?.forEach((fn) => fn(value));
  }

  // helpers
  ready(on: boolean) { this.client.send({ type: "game_ready", on }); }
  start() { this.client.send({ type: "game_start" }); }
  input(data: unknown, tCapture = this.now()) { this.client.send({ type: "game_input", data, tCapture }); }
  pose(data: unknown, seq: number) { this.client.send({ type: "game_pose", data, seq }); }
  commit(round: number, hash: string) { this.client.send({ type: "game_commit", round, hash }); }
  reveal(round: number, choice: string, salt: string) { this.client.send({ type: "game_reveal", round, choice, salt }); }
  score(score: number, final = false) { this.client.send({ type: "game_score", score, final }); }

  /** Forget buffered round data before a rematch. */
  resetLogs() {
    this.commits.clear();
    this.reveals.clear();
    this.scores.clear();
    this.inputLog = [];
  }

  close() {
    this.offs.forEach((o) => o());
    this.offs = [];
    this.subs = {};
    this.client.close();
  }
}
