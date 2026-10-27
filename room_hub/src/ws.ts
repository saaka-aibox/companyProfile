import crypto from "node:crypto";
import type http from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import type { App } from "./app.js";
import { clientIp } from "./http.js";
import { verifyJwt } from "./jwt.js";
import type {
  ClientMsg, ErrorCode, Peer, Quorum, Role, ServerMsg, SessionState, Trigger,
} from "./protocol.js";
import { RETAKES_PER_ROUND, ROUNDS } from "./protocol.js";
import { summary } from "./rooms.js";
import { Keys } from "./storage.js";
import type { RoomRec } from "./store.js";
import { RateLimiter, log, randId, sha256hex } from "./util.js";

/** Close codes (4000-4099 are terminal; clients must not auto-reconnect on these). */
export const CLOSE = {
  BAD_REQUEST: 4000,
  COMPLETED: 4001,
  ROOM_NOT_FOUND: 4002,
  BAD_TOKEN: 4003,
  FULL: 4004,
  REPLACED: 4005, // same deviceId connected elsewhere
  HELLO_TIMEOUT: 4006,
  ABUSE: 4007,
  EXPIRED: 4010, // game room TTL
  ABANDONED: 4011,
} as const;

const MAX_MSG_BYTES = 64 * 1024;
const HELLO_TIMEOUT_MS = 10_000;
const MIN_FINAL_BYTES = 50 * 1024;
const UPLOAD_URL_TTL = 120;
const STILL_GET_TTL = 600;

type Conn = {
  ws: WebSocket; deviceId: string; name: string; slot: number; caps: { mp: boolean };
  lastSeen: number; ready: boolean; peace: boolean; gameReady: boolean;
};

type GameRt = {
  phase: "lobby" | "countdown" | "playing" | "ended";
  seed: number; startAt: number | null;
  commits: Map<number, Map<string, string>>;
  finals: Map<string, number>;
  timer: NodeJS.Timeout | null;
};

type RoomRt = {
  id: string;
  conns: Map<string, Conn>;
  controllerId: string | null;
  session: SessionState;
  participants: number[]; // slots present when the countdown started
  captured: Map<number, string>;
  peaceLatched: boolean;
  composing: boolean;
  game: GameRt | null;
  t: {
    countdown?: NodeJS.Timeout; collect?: NodeJS.Timeout; auto?: NodeJS.Timeout; peace?: NodeJS.Timeout;
    hostGone?: NodeJS.Timeout; limit?: NodeJS.Timeout;
  };
};

type Sock = { ws: WebSocket; ip: string; conn?: Conn; rt?: RoomRt; lastSeen: number; bucket: RateLimiter; id: string };

export class Hub {
  private wss: WebSocketServer;
  private rts = new Map<string, RoomRt>();
  private socks = new Set<Sock>();
  private hb: NodeJS.Timeout;
  private ipConnLimiter = new RateLimiter();

  constructor(private app: App) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG_BYTES });
    this.hb = setInterval(() => this.heartbeat(), app.cfg.timing.heartbeatMs);
    this.hb.unref?.();
  }

  /* ------------------------------------------------------------ plumbing */
  attach(server: http.Server): void {
    server.on("upgrade", (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = new URL(req.url ?? "/", "http://x");
      const ip = clientIp(req, this.app.cfg.trustProxy);
      if (url.pathname !== "/ws" || !this.app.router.originOk(req.headers.origin) || !this.ipConnLimiter.take(ip, 20, 0.5)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, ip));
    });
  }

  isConnected(roomId: string, deviceId: string): boolean {
    return !!this.rts.get(roomId)?.conns.has(deviceId);
  }

  /** Close every socket of a room and drop its runtime (completed / deleted / expired). */
  closeRoom(roomId: string, code: number, reason: string): void {
    const rt = this.rts.get(roomId);
    if (!rt) return;
    this.clearTimers(rt);
    if (rt.game?.timer) clearTimeout(rt.game.timer);
    for (const c of rt.conns.values()) {
      try { c.ws.close(code, reason); } catch { /* ignore */ }
    }
    this.rts.delete(roomId);
  }

  shutdown(): void {
    clearInterval(this.hb);
    for (const rt of this.rts.values()) {
      this.clearTimers(rt);
      if (rt.game?.timer) clearTimeout(rt.game.timer);
    }
    for (const s of this.socks) { try { s.ws.terminate(); } catch { /* ignore */ } }
    this.wss.close();
  }

  private heartbeat(): void {
    const now = Date.now();
    for (const s of this.socks) {
      if (now - s.lastSeen > this.app.cfg.timing.idleMs) {
        s.ws.terminate();
        continue;
      }
      try { s.ws.ping(); } catch { /* ignore */ }
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }
  private broadcast(rt: RoomRt, msg: ServerMsg, exceptId?: string): void {
    const data = JSON.stringify(msg);
    for (const c of rt.conns.values()) {
      if (c.deviceId !== exceptId && c.ws.readyState === c.ws.OPEN) c.ws.send(data);
    }
  }
  private err(ws: WebSocket, code: ErrorCode, message: string): void {
    this.send(ws, { type: "error", code, message });
  }
  private terminal(ws: WebSocket, closeCode: number, code: ErrorCode, message: string): void {
    this.send(ws, { type: "error", code, message });
    try { ws.close(closeCode, message.slice(0, 100)); } catch { /* ignore */ }
  }

  private room(rt: RoomRt): RoomRec | undefined {
    return this.app.store.rooms.get(rt.id);
  }
  private peer(rt: RoomRt, c: Conn): Peer {
    return {
      id: c.deviceId, name: c.name, slot: c.slot, role: rt.controllerId === c.deviceId ? "host" : "guest",
      connected: true, ready: c.ready, peace: c.peace,
    };
  }
  private broadcastState(rt: RoomRt): void {
    const room = this.room(rt);
    if (room && !rt.game) this.broadcast(rt, { type: "state", session: rt.session, room: summary(room) });
  }

  private ensureRt(room: RoomRec): RoomRt {
    let rt = this.rts.get(room.id);
    if (!rt) {
      rt = {
        id: room.id, conns: new Map(), controllerId: null,
        session: {
          phase: "lobby", round: 0, attempt: 0, retakesLeft: RETAKES_PER_ROUND, trigger: "manual", quorum: "all",
          accepted: {}, sessionEndsAt: null,
        },
        participants: [], captured: new Map(), peaceLatched: false, composing: false, game: null, t: {},
      };
      if (room.kind === "game") {
        rt.game = { phase: "lobby", seed: 0, startAt: null, commits: new Map(), finals: new Map(), timer: null };
      }
      this.rts.set(room.id, rt);
    }
    return rt;
  }

  private clearTimers(rt: RoomRt): void {
    for (const k of Object.keys(rt.t) as (keyof RoomRt["t"])[]) {
      if (rt.t[k]) clearTimeout(rt.t[k]);
      delete rt.t[k];
    }
  }

  /* ---------------------------------------------------------- connection */
  private onConnection(ws: WebSocket, ip: string): void {
    const sock: Sock = { ws, ip, lastSeen: Date.now(), bucket: new RateLimiter(), id: randId(6) };
    this.socks.add(sock);
    const helloTimer = setTimeout(() => {
      if (!sock.conn) this.terminal(ws, CLOSE.HELLO_TIMEOUT, "BAD_REQUEST", "hello timeout");
    }, HELLO_TIMEOUT_MS);
    helloTimer.unref?.();

    ws.on("pong", () => { sock.lastSeen = Date.now(); });
    ws.on("message", (data, isBinary) => {
      sock.lastSeen = Date.now();
      if (isBinary) return;
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return this.err(ws, "BAD_REQUEST", "invalid JSON"); }
      if (!msg || typeof msg.type !== "string") return this.err(ws, "BAD_REQUEST", "missing type");
      if (!sock.conn) {
        if (msg.type !== "hello") return this.terminal(ws, CLOSE.BAD_REQUEST, "BAD_REQUEST", "first message must be hello");
        clearTimeout(helloTimer);
        this.onHello(sock, msg);
        return;
      }
      const isPose = msg.type === "game_pose";
      if (!sock.bucket.take(isPose ? "pose" : "msg", isPose ? 25 : 40, isPose ? 25 : 40)) {
        if (!isPose) this.err(ws, "RATE_LIMIT", "too many messages");
        return;
      }
      if (!sock.bucket.take("all", 100, 80)) return; // overall flood guard (pose + msg combined)
      try {
        this.onMessage(sock.rt!, sock.conn, msg as ClientMsg);
      } catch (e) {
        log("ws handler error", e);
        this.err(ws, "INTERNAL", "internal error");
      }
    });
    ws.on("close", () => {
      clearTimeout(helloTimer);
      this.socks.delete(sock);
      if (sock.conn && sock.rt) this.onDisconnect(sock.rt, sock.conn);
    });
    ws.on("error", () => { /* close follows */ });
  }

  private onHello(sock: Sock, msg: any): void {
    const { ws } = sock;
    const p = verifyJwt(msg.token, this.app.cfg.jwtSecret);
    if (!p || typeof p.roomId !== "string" || typeof p.deviceId !== "string") {
      return this.terminal(ws, CLOSE.BAD_TOKEN, "UNAUTHORIZED", "invalid or expired token");
    }
    const room = this.app.store.rooms.get(p.roomId);
    if (!room) return this.terminal(ws, CLOSE.ROOM_NOT_FOUND, "ROOM_NOT_FOUND", "room not found");
    if (room.status === "completed") return this.terminal(ws, CLOSE.COMPLETED, "ROOM_COMPLETED", "room already completed");
    if (room.status !== "open" && room.status !== "in_session") {
      return this.terminal(ws, CLOSE.ROOM_NOT_FOUND, "ROOM_NOT_FOUND", "room is closed");
    }
    const dev = room.devices[p.deviceId];
    if (!dev || dev.slot !== p.slot) return this.terminal(ws, CLOSE.BAD_TOKEN, "UNAUTHORIZED", "token does not match room membership");

    const rt = this.ensureRt(room);
    const existing = rt.conns.get(p.deviceId);
    if (!existing && rt.conns.size >= room.maxDevices) return this.terminal(ws, CLOSE.FULL, "ROOM_FULL", "room is full");

    if (existing) {
      // Same device reconnecting: drop the old socket quietly.
      rt.conns.delete(p.deviceId);
      this.broadcast(rt, { type: "peer_leave", id: p.deviceId });
      this.terminal(existing.ws, CLOSE.REPLACED, "BAD_REQUEST", "replaced by a newer connection");
    }

    const name = (typeof msg.deviceName === "string" ? msg.deviceName : dev.name).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) || dev.name;
    dev.name = name;
    dev.lastSeen = Date.now();
    const conn: Conn = {
      ws, deviceId: p.deviceId, name, slot: dev.slot, caps: { mp: !!msg.caps?.mp },
      lastSeen: Date.now(), ready: false, peace: false, gameReady: false,
    };
    sock.conn = conn;
    sock.rt = rt;
    rt.conns.set(conn.deviceId, conn);

    // controller bookkeeping
    if (room.hostDeviceId === conn.deviceId) {
      const prev = rt.controllerId;
      rt.controllerId = conn.deviceId;
      if (rt.t.hostGone) { clearTimeout(rt.t.hostGone); delete rt.t.hostGone; }
      if (prev && prev !== conn.deviceId) {
        const pc = rt.conns.get(prev);
        if (pc) this.broadcast(rt, { type: "peer_update", peer: this.peer(rt, pc) });
      }
    } else if (!rt.controllerId) {
      this.armHostGone(rt);
    }

    const me = this.peer(rt, conn);
    const others = [...rt.conns.values()].filter((c) => c !== conn).map((c) => this.peer(rt, c));
    this.send(ws, {
      type: "welcome", you: conn.deviceId, slot: conn.slot, role: me.role, peers: others,
      room: summary(room), session: rt.game ? null : rt.session, serverNow: Date.now(),
    });
    this.broadcast(rt, { type: "peer_join", peer: me }, conn.deviceId);
    if (rt.game) this.send(ws, this.gameStateMsg(rt));
    // Late joiner during a countdown: tell them when to shoot.
    if (!rt.game && rt.session.phase === "countdown" && rt.t.countdown) {
      // countdown timer holds shootAt in closure; resend via stored value
      const sh = (rt as any).shootAt as number | undefined;
      if (sh) this.send(ws, { type: "countdown", round: rt.session.round, attempt: rt.session.attempt, shootAt: sh, seconds: Math.round(this.app.cfg.timing.countdownMs / 1000) });
    }
    this.broadcastState(rt);
    this.armAuto(rt);
    this.evalPeace(rt);
  }

  private onDisconnect(rt: RoomRt, conn: Conn): void {
    if (rt.conns.get(conn.deviceId) !== conn) return; // already replaced
    rt.conns.delete(conn.deviceId);
    const room = this.room(rt);
    const dev = room?.devices[conn.deviceId];
    if (dev) dev.lastSeen = Date.now();
    this.broadcast(rt, { type: "peer_leave", id: conn.deviceId });
    if (rt.controllerId === conn.deviceId) {
      rt.controllerId = null;
      this.armHostGone(rt);
      if (rt.t.auto) { clearTimeout(rt.t.auto); delete rt.t.auto; } // paused
      if (rt.t.peace) { clearTimeout(rt.t.peace); delete rt.t.peace; }
    }
    if (rt.game) {
      rt.game.commits.forEach(() => undefined);
      this.checkGameEnd(rt);
    } else {
      this.evalPeace(rt);
      if (rt.session.phase === "collecting") this.checkRoundComplete(rt);
    }
    this.broadcastState(rt);
  }

  /* ----------------------------------------------------------- host duty */
  private armHostGone(rt: RoomRt): void {
    if (rt.t.hostGone || rt.conns.size === 0) return;
    rt.t.hostGone = setTimeout(() => {
      delete rt.t.hostGone;
      this.promote(rt);
    }, this.app.cfg.timing.hostGraceMs);
    rt.t.hostGone.unref?.();
  }

  private promote(rt: RoomRt): void {
    if (rt.controllerId) return;
    const room = this.room(rt);
    if (!room || rt.conns.size === 0) return;
    const next = [...rt.conns.values()].sort((a, b) => {
      const ja = room.devices[a.deviceId]?.joinedAt ?? 0;
      const jb = room.devices[b.deviceId]?.joinedAt ?? 0;
      return ja - jb || a.slot - b.slot;
    })[0];
    rt.controllerId = next.deviceId;
    log(`room ${rt.id}: promoted ${next.deviceId} to controller`);
    this.broadcast(rt, { type: "peer_update", peer: this.peer(rt, next) });
    this.broadcastState(rt);
    this.armAuto(rt);
    this.evalPeace(rt);
  }

  private isController(rt: RoomRt, c: Conn): boolean {
    return rt.controllerId === c.deviceId;
  }
  private needHost(rt: RoomRt, c: Conn): boolean {
    if (this.isController(rt, c)) return true;
    this.err(c.ws, "NOT_HOST", "only the host can do this");
    return false;
  }

  /* ------------------------------------------------------------ messages */
  private onMessage(rt: RoomRt, c: Conn, m: ClientMsg): void {
    switch (m.type) {
      case "ping":
        return this.send(c.ws, { type: "pong", t: Number(m.t) || 0, serverNow: Date.now() });
      case "signal": {
        const to = rt.conns.get(String(m.to));
        if (to && to !== c) this.send(to.ws, { type: "signal", from: c.deviceId, data: m.data });
        return;
      }
      case "stats":
        return;
      case "ready": {
        if (rt.game) return this.err(c.ws, "INVALID_STATE", "not a photo room");
        c.ready = !!m.on;
        return this.broadcast(rt, { type: "peer_update", peer: this.peer(rt, c) });
      }
      case "gesture": {
        if (rt.game) return this.err(c.ws, "INVALID_STATE", "not a photo room");
        c.peace = !!m.peace;
        this.broadcast(rt, { type: "peer_update", peer: this.peer(rt, c) });
        return this.evalPeace(rt);
      }
      case "settings":
        return this.onSettings(rt, c, m);
      case "start_round":
        return this.onStartRound(rt, c);
      case "upload_req":
        return this.onUploadReq(rt, c, m);
      case "captured":
        void this.onCaptured(rt, c, m);
        return;
      case "review":
        return this.onReview(rt, c, m);
      case "compose_req":
        return this.onComposeReq(rt, c);
      case "compose_done":
        void this.onComposeDone(rt, c, m);
        return;
      case "game_ready":
      case "game_start":
      case "game_input":
      case "game_pose":
      case "game_commit":
      case "game_reveal":
      case "game_score":
        return this.onGame(rt, c, m);
      case "hello":
        return this.err(c.ws, "BAD_REQUEST", "already authenticated");
      default:
        return this.err(c.ws, "BAD_REQUEST", "unknown message type");
    }
  }

  /* ---------------------------------------------------------- photo flow */
  private photoOnly(rt: RoomRt, c: Conn): boolean {
    if (rt.game) { this.err(c.ws, "INVALID_STATE", "not a photo room"); return false; }
    return true;
  }

  private onSettings(rt: RoomRt, c: Conn, m: Extract<ClientMsg, { type: "settings" }>): void {
    if (!this.photoOnly(rt, c) || !this.needHost(rt, c)) return;
    const ph = rt.session.phase;
    if (ph === "countdown" || ph === "collecting" || ph === "composing" || ph === "completed") {
      return this.err(c.ws, "INVALID_STATE", "settings cannot change right now");
    }
    if (m.trigger !== undefined) {
      if (!["manual", "timer", "peace"].includes(m.trigger)) return this.err(c.ws, "BAD_REQUEST", "bad trigger");
      rt.session.trigger = m.trigger as Trigger;
    }
    if (m.quorum !== undefined) {
      if (!["all", "majority", "host"].includes(m.quorum)) return this.err(c.ws, "BAD_REQUEST", "bad quorum");
      rt.session.quorum = m.quorum as Quorum;
    }
    if (rt.t.auto) { clearTimeout(rt.t.auto); delete rt.t.auto; }
    this.broadcastState(rt);
    this.armAuto(rt);
    this.evalPeace(rt);
  }

  private onStartRound(rt: RoomRt, c: Conn): void {
    if (!this.photoOnly(rt, c) || !this.needHost(rt, c)) return;
    const s = rt.session;
    if (s.phase !== "lobby" && s.phase !== "pose_ready") return this.err(c.ws, "INVALID_STATE", `cannot start a round from ${s.phase}`);
    const fromLobby = s.phase === "lobby";
    if (fromLobby) this.beginSession(rt);
    if (fromLobby && s.trigger !== "manual") this.enterPoseReady(rt);
    else this.startCountdown(rt);
  }

  private beginSession(rt: RoomRt): void {
    const room = this.room(rt);
    const lim = this.app.cfg.timing.sessionLimitMs;
    rt.session.sessionEndsAt = Date.now() + lim;
    if (room && room.status === "open") {
      room.status = "in_session";
      this.app.store.save();
    }
    rt.t.limit = setTimeout(() => this.onSessionLimit(rt), lim);
    rt.t.limit.unref?.();
  }

  private onSessionLimit(rt: RoomRt): void {
    delete rt.t.limit;
    const s = rt.session;
    if (s.phase === "composing" || s.phase === "completed") return;
    for (const k of ["countdown", "collect", "auto", "peace"] as const) {
      if (rt.t[k]) { clearTimeout(rt.t[k]); delete rt.t[k]; }
    }
    s.phase = "composing";
    log(`room ${rt.id}: session limit reached`);
    this.broadcastState(rt);
  }

  private enterPoseReady(rt: RoomRt): void {
    rt.session.phase = "pose_ready";
    this.broadcastState(rt);
    this.armAuto(rt);
    this.evalPeace(rt);
  }

  private armAuto(rt: RoomRt): void {
    const s = rt.session;
    if (rt.game || rt.t.auto || s.phase !== "pose_ready" || s.trigger !== "timer" || !rt.controllerId) return;
    rt.t.auto = setTimeout(() => {
      delete rt.t.auto;
      if (rt.session.phase === "pose_ready" && rt.session.trigger === "timer" && rt.controllerId) this.startCountdown(rt);
    }, this.app.cfg.timing.autoTimerMs);
    rt.t.auto.unref?.();
  }

  private peaceNeeds(rt: RoomRt): { n: number; needed: number; have: number; counts: Record<string, boolean> } {
    const conns = [...rt.conns.values()];
    const n = conns.length;
    const counts: Record<string, boolean> = {};
    for (const c of conns) counts[c.deviceId] = c.peace;
    let have = conns.filter((c) => c.peace).length;
    let needed: number;
    if (rt.session.quorum === "all") needed = n;
    else if (rt.session.quorum === "majority") needed = Math.floor(n / 2) + 1;
    else {
      needed = 1;
      have = rt.controllerId && rt.conns.get(rt.controllerId)?.peace ? 1 : 0;
    }
    return { n, needed, have, counts };
  }

  private evalPeace(rt: RoomRt): void {
    if (rt.game) return;
    const { n, needed, have, counts } = this.peaceNeeds(rt);
    const anyPeace = [...rt.conns.values()].some((c) => c.peace);
    this.broadcast(rt, { type: "peace", counts, needed, have });
    if (!anyPeace) rt.peaceLatched = false; // hands came down: re-arm
    const met = n > 0 && have >= needed;
    const armed = rt.session.phase === "pose_ready" && rt.session.trigger === "peace" && !!rt.controllerId && !rt.peaceLatched;
    if (armed && met) {
      if (rt.t.peace) return;
      rt.t.peace = setTimeout(() => {
        delete rt.t.peace;
        const again = this.peaceNeeds(rt);
        if (rt.session.phase === "pose_ready" && rt.session.trigger === "peace" && !rt.peaceLatched && rt.controllerId && again.n > 0 && again.have >= again.needed) {
          this.startCountdown(rt);
        }
      }, this.app.cfg.timing.peaceStableMs);
      rt.t.peace.unref?.();
    } else if (rt.t.peace) {
      clearTimeout(rt.t.peace);
      delete rt.t.peace;
    }
  }

  private startCountdown(rt: RoomRt): void {
    const s = rt.session;
    if (s.phase !== "lobby" && s.phase !== "pose_ready") return;
    if (rt.conns.size === 0) return;
    for (const k of ["auto", "peace"] as const) if (rt.t[k]) { clearTimeout(rt.t[k]); delete rt.t[k]; }
    const tm = this.app.cfg.timing;
    const now = Date.now();
    const shootAt = now + tm.countdownMs + tm.leadMs;
    (rt as any).shootAt = shootAt;
    rt.participants = [...rt.conns.values()].map((c) => c.slot).sort((a, b) => a - b);
    rt.captured = new Map();
    // hands may still be up from the previous shot: require a reset before the next peace trigger
    rt.peaceLatched = [...rt.conns.values()].some((c) => c.peace);
    s.phase = "countdown";
    this.broadcast(rt, { type: "countdown", round: s.round, attempt: s.attempt, shootAt, seconds: Math.round(tm.countdownMs / 1000) });
    this.broadcastState(rt);
    const round = s.round;
    const attempt = s.attempt;
    rt.t.countdown = setTimeout(() => {
      delete rt.t.countdown;
      if (s.phase !== "countdown" || s.round !== round || s.attempt !== attempt) return;
      s.phase = "collecting";
      this.broadcastState(rt);
      rt.t.collect = setTimeout(() => {
        delete rt.t.collect;
        if (s.phase === "collecting" && s.round === round && s.attempt === attempt) this.finishRound(rt);
      }, tm.collectTimeoutMs);
      rt.t.collect.unref?.();
      this.checkRoundComplete(rt);
    }, Math.max(0, shootAt - now));
    rt.t.countdown.unref?.();
  }

  private onUploadReq(rt: RoomRt, c: Conn, m: Extract<ClientMsg, { type: "upload_req" }>): void {
    if (!this.photoOnly(rt, c)) return;
    const s = rt.session;
    const shootAt = (rt as any).shootAt as number | undefined;
    const early = s.phase === "countdown" && shootAt !== undefined && Date.now() >= shootAt - 1000; // clock-skew slack
    if (s.phase !== "collecting" && !early) return this.err(c.ws, "INVALID_STATE", "not collecting photos");
    if (m.round !== s.round || m.attempt !== s.attempt) return this.err(c.ws, "INVALID_STATE", "stale round/attempt");
    if (!rt.participants.includes(c.slot)) return this.err(c.ws, "INVALID_STATE", "you were not part of this round");
    const key = Keys.still(rt.id, s.round, s.attempt, c.slot);
    const { url, headers } = this.app.storage.presignPut(key, "image/jpeg", UPLOAD_URL_TTL);
    this.send(c.ws, { type: "upload_url", round: s.round, attempt: s.attempt, url, key, headers, expiresIn: UPLOAD_URL_TTL });
  }

  private async onCaptured(rt: RoomRt, c: Conn, m: Extract<ClientMsg, { type: "captured" }>): Promise<void> {
    if (!this.photoOnly(rt, c)) return;
    const s = rt.session;
    if (s.phase !== "collecting" && s.phase !== "countdown") return this.err(c.ws, "INVALID_STATE", "not collecting photos");
    if (m.round !== s.round || m.attempt !== s.attempt) return this.err(c.ws, "INVALID_STATE", "stale round/attempt");
    const expected = Keys.still(rt.id, s.round, s.attempt, c.slot);
    if (m.key !== expected || !rt.participants.includes(c.slot)) return this.err(c.ws, "BAD_REQUEST", "key does not match the one issued for you");
    let head;
    try { head = await this.app.storage.head(expected); } catch { head = null; }
    if (!head || head.size < 1 || head.size > this.app.cfg.uploadMaxBytes) {
      return this.err(c.ws, "INVALID_STATE", "uploaded object not found or too large");
    }
    if (s.phase !== "collecting" || s.round !== m.round || s.attempt !== m.attempt) return; // moved on meanwhile
    rt.captured.set(c.slot, expected);
    this.checkRoundComplete(rt);
  }

  private checkRoundComplete(rt: RoomRt): void {
    if (rt.session.phase !== "collecting") return;
    const waiting = [...rt.conns.values()].filter((c) => rt.participants.includes(c.slot) && !rt.captured.has(c.slot));
    if (waiting.length === 0) this.finishRound(rt);
  }

  private finishRound(rt: RoomRt): void {
    const s = rt.session;
    if (s.phase !== "collecting") return;
    if (rt.t.collect) { clearTimeout(rt.t.collect); delete rt.t.collect; }
    s.phase = "reviewing";
    const stills = [...rt.captured.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([slot, key]) => ({ slot, key, url: this.app.storage.presignGet(key, STILL_GET_TTL) }));
    const missing = rt.participants.filter((sl) => !rt.captured.has(sl));
    this.broadcast(rt, { type: "round_ready", round: s.round, attempt: s.attempt, stills, missing });
    this.broadcastState(rt);
  }

  private onReview(rt: RoomRt, c: Conn, m: Extract<ClientMsg, { type: "review" }>): void {
    if (!this.photoOnly(rt, c) || !this.needHost(rt, c)) return;
    const s = rt.session;
    if (s.phase !== "reviewing" || m.round !== s.round) return this.err(c.ws, "INVALID_STATE", "nothing to review");
    if (m.action === "retake") {
      if (s.retakesLeft <= 0) return this.err(c.ws, "INVALID_STATE", "no retakes left for this round");
      s.retakesLeft -= 1;
      s.attempt += 1;
      rt.captured = new Map();
      this.enterPoseReady(rt);
    } else if (m.action === "accept") {
      s.accepted[s.round] = Object.fromEntries(rt.captured);
      rt.captured = new Map();
      if (s.round >= ROUNDS - 1) {
        s.phase = "composing";
        if (rt.t.limit) { clearTimeout(rt.t.limit); delete rt.t.limit; }
        this.broadcastState(rt);
      } else {
        s.round += 1;
        s.attempt = 0;
        s.retakesLeft = RETAKES_PER_ROUND;
        this.enterPoseReady(rt);
      }
    } else {
      this.err(c.ws, "BAD_REQUEST", "action must be accept or retake");
    }
  }

  private onComposeReq(rt: RoomRt, c: Conn): void {
    if (!this.photoOnly(rt, c) || !this.needHost(rt, c)) return;
    if (rt.session.phase !== "composing") return this.err(c.ws, "INVALID_STATE", "not composing yet");
    const st = this.app.storage;
    const fk = Keys.final(rt.id);
    const tk = Keys.thumb(rt.id);
    const f = st.presignPut(fk, "image/jpeg", 300);
    const t = st.presignPut(tk, "image/webp", 300);
    this.send(c.ws, {
      type: "compose_url",
      final: { url: f.url, key: fk, headers: f.headers },
      thumb: { url: t.url, key: tk, headers: t.headers },
    });
  }

  private async onComposeDone(rt: RoomRt, c: Conn, m: Extract<ClientMsg, { type: "compose_done" }>): Promise<void> {
    if (!this.photoOnly(rt, c) || !this.needHost(rt, c)) return;
    if (rt.session.phase !== "composing" || rt.composing) return this.err(c.ws, "INVALID_STATE", "not composing");
    const fk = Keys.final(rt.id);
    const tk = Keys.thumb(rt.id);
    if (m.finalKey !== fk || m.thumbKey !== tk) return this.err(c.ws, "BAD_REQUEST", "unexpected keys");
    rt.composing = true;
    try {
      const [fh, th] = await Promise.all([this.app.storage.head(fk), this.app.storage.head(tk)]);
      if (!fh || fh.size <= MIN_FINAL_BYTES || fh.contentType !== "image/jpeg") {
        return this.err(c.ws, "INVALID_STATE", "final.jpg missing, too small or not image/jpeg");
      }
      if (!th || th.size < 1) return this.err(c.ws, "INVALID_STATE", "thumb missing");
      const room = this.room(rt);
      if (!room || room.status === "completed") return;
      const now = Date.now();
      const stills: { round: number; slot: number; key: string }[] = [];
      for (const [r, slots] of Object.entries(rt.session.accepted)) {
        for (const [sl, key] of Object.entries(slots)) stills.push({ round: Number(r), slot: Number(sl), key });
      }
      const resultId = randId(16);
      this.app.store.results.set(resultId, {
        id: resultId, roomId: room.id, frameId: room.frameId ?? "songs", createdAt: now,
        deleteAt: now + this.app.cfg.timing.resultTtlMs, finalKey: fk, thumbKey: tk, stills, variants: [],
      });
      room.status = "completed";
      room.completedAt = now;
      room.resultId = resultId;
      this.app.store.save();
      rt.session.phase = "completed";
      const resultUrl = `${this.app.cfg.appUrl}/room/result/${resultId}`;
      this.broadcast(rt, { type: "completed", resultId, resultUrl });
      log(`room ${room.id} completed -> result ${resultId}`);
      // let the message flush, then close everything with the terminal code
      setTimeout(() => this.closeRoom(room.id, CLOSE.COMPLETED, "completed"), 50);
    } finally {
      rt.composing = false;
    }
  }

  /* ---------------------------------------------------------------- games */
  private gameStateMsg(rt: RoomRt): ServerMsg {
    const g = rt.game!;
    const ready: Record<string, boolean> = {};
    for (const c of rt.conns.values()) ready[c.deviceId] = c.gameReady;
    return { type: "game_state", phase: g.phase, seed: g.seed, startAt: g.startAt, ready };
  }

  private checkGameEnd(rt: RoomRt): void {
    const g = rt.game;
    if (!g || g.phase !== "playing" || rt.conns.size === 0) return;
    if ([...rt.conns.values()].every((c) => g.finals.has(c.deviceId))) {
      g.phase = "ended";
      this.broadcast(rt, this.gameStateMsg(rt));
    }
  }

  private onGame(rt: RoomRt, c: Conn, m: ClientMsg): void {
    const g = rt.game;
    if (!g) return this.err(c.ws, "INVALID_STATE", "not a game room");
    switch (m.type) {
      case "game_ready":
        c.gameReady = !!(m as any).on;
        return this.broadcast(rt, this.gameStateMsg(rt));
      case "game_start": {
        if (!this.needHost(rt, c)) return;
        if (g.phase === "countdown" || g.phase === "playing") return this.err(c.ws, "INVALID_STATE", "game already running");
        g.phase = "countdown";
        g.seed = crypto.randomInt(1, 2 ** 31);
        g.startAt = Date.now() + 3000;
        g.commits = new Map();
        g.finals = new Map();
        this.broadcast(rt, this.gameStateMsg(rt));
        g.timer = setTimeout(() => {
          g.timer = null;
          if (g.phase === "countdown") {
            g.phase = "playing";
            this.broadcast(rt, this.gameStateMsg(rt));
          }
        }, 3000);
        g.timer.unref?.();
        return;
      }
      case "game_input": {
        const mm = m as Extract<ClientMsg, { type: "game_input" }>;
        return this.broadcast(rt, { type: "game_input", from: c.deviceId, data: mm.data, tCapture: Number(mm.tCapture) || 0, tServer: Date.now() }, c.deviceId);
      }
      case "game_pose": {
        const mm = m as Extract<ClientMsg, { type: "game_pose" }>;
        return this.broadcast(rt, { type: "game_pose", from: c.deviceId, data: mm.data, seq: Number(mm.seq) || 0 }, c.deviceId);
      }
      case "game_commit": {
        const mm = m as Extract<ClientMsg, { type: "game_commit" }>;
        const round = Number(mm.round);
        if (!Number.isInteger(round) || round < 0 || round > 1000) return this.err(c.ws, "BAD_REQUEST", "bad round");
        if (typeof mm.hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(mm.hash)) return this.err(c.ws, "BAD_REQUEST", "hash must be sha256 hex");
        let per = g.commits.get(round);
        if (!per) { per = new Map(); g.commits.set(round, per); }
        if (per.has(c.deviceId)) return this.err(c.ws, "INVALID_STATE", "already committed this round");
        per.set(c.deviceId, mm.hash.toLowerCase());
        return this.broadcast(rt, { type: "game_commit", from: c.deviceId, round }, c.deviceId);
      }
      case "game_reveal": {
        const mm = m as Extract<ClientMsg, { type: "game_reveal" }>;
        const round = Number(mm.round);
        const per = g.commits.get(round);
        const hash = per?.get(c.deviceId);
        if (!hash) return this.err(c.ws, "INVALID_STATE", "no commit for this round");
        if (typeof mm.choice !== "string" || typeof mm.salt !== "string" || mm.choice.length > 64 || mm.salt.length > 256) {
          return this.err(c.ws, "BAD_REQUEST", "bad reveal");
        }
        per!.delete(c.deviceId); // one reveal per commit
        const valid = sha256hex(`${mm.choice}:${mm.salt}`) === hash;
        return this.broadcast(rt, { type: "game_reveal", from: c.deviceId, round, choice: mm.choice, valid });
      }
      case "game_score": {
        const mm = m as Extract<ClientMsg, { type: "game_score" }>;
        const score = Number(mm.score);
        if (!Number.isFinite(score)) return this.err(c.ws, "BAD_REQUEST", "bad score");
        this.broadcast(rt, { type: "game_score", from: c.deviceId, score, final: !!mm.final }, c.deviceId);
        if (mm.final) {
          g.finals.set(c.deviceId, score);
          this.checkGameEnd(rt);
        }
        return;
      }
    }
  }
}

export type { Role };
