import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { clamp, dist } from "./util";

// Same pinned URLs as src/components/landing/useGestureCamera.ts.
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

export type Pt = { x: number; y: number };
export type GestureName =
  | "None" | "Closed_Fist" | "Open_Palm" | "Pointing_Up" | "Thumb_Down" | "Thumb_Up" | "Victory" | "ILoveYou";
/** Game level hand symbols (built-in gestures + finger counts). */
export type HandSymbol = "none" | "fist" | "palm" | "peace" | "thumb" | "rock" | "one" | "three" | "four";

export type PlayerHand = {
  player: number;
  present: boolean;
  /** Label of this frame only. */
  raw: GestureName;
  rawSymbol: HandSymbol;
  score: number;
  /** Majority vote over the last 5 frames. */
  gesture: GestureName;
  symbol: HandSymbol;
  /** 21 landmarks in display space (x mirrored so it matches the selfie preview), 0..1. */
  lm: Pt[];
  wrist: Pt;
  /** Mean of landmarks 0, 5, 9, 13, 17. */
  palm: Pt;
  /** Index fingertip (landmark 8), unfiltered. */
  tip: Pt;
  /** One-Euro filtered index fingertip. */
  cursor: Pt;
  fingers: number;
  thumbOut: boolean;
};

export type HandFrame = {
  /** performance.now() at inference. */
  t: number;
  seq: number;
  players: PlayerHand[];
  handCount: number;
};

export type TrackerStatus = "idle" | "loading" | "running" | "error";

// ---------------------------------------------------------------- filters

/** One-Euro filter (Casiez et al.) for jitter free, low latency fingertip cursors. */
export class OneEuro {
  private xPrev = 0;
  private dxPrev = 0;
  private tPrev = 0;
  private has = false;
  constructor(private minCutoff = 1.6, private beta = 14, private dCutoff = 1) {}
  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  reset() {
    this.has = false;
  }
  filter(x: number, tSec: number) {
    if (!this.has) {
      this.has = true;
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = tSec;
      return x;
    }
    const dt = Math.max(1e-3, tSec - this.tPrev);
    const dx = (x - this.xPrev) / dt;
    const dxHat = this.dxPrev + OneEuro.alpha(this.dCutoff, dt) * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const xHat = this.xPrev + OneEuro.alpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tSec;
    return xHat;
  }
}

/** Majority vote over the last N labels. Ties keep the previous winner. */
export class MajorityVote<T extends string> {
  private buf: T[] = [];
  private last: T;
  constructor(private size: number, initial: T) {
    this.last = initial;
  }
  push(value: T): T {
    this.buf.push(value);
    if (this.buf.length > this.size) this.buf.shift();
    const counts = new Map<T, number>();
    for (const v of this.buf) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best = this.last;
    let bestN = counts.get(this.last) ?? 0;
    for (const [v, n] of counts) {
      if (n > bestN) {
        best = v;
        bestN = n;
      }
    }
    this.last = best;
    return best;
  }
}

/** Hold a value for `ms` to lock it. `locked` is true on exactly one update. */
export class HoldToConfirm {
  private value: string | null = null;
  private since = 0;
  private fired = false;
  constructor(public ms: number) {}
  reset() {
    this.value = null;
    this.fired = false;
  }
  update(value: string | null | undefined, now: number) {
    if (!value || value === "none") {
      this.reset();
      return { value: null as string | null, progress: 0, locked: false };
    }
    if (value !== this.value) {
      this.value = value;
      this.since = now;
      this.fired = false;
    }
    const progress = clamp((now - this.since) / this.ms, 0, 1);
    let locked = false;
    if (progress >= 1 && !this.fired) {
      this.fired = true;
      locked = true;
    }
    return { value: this.value, progress, locked };
  }
}

// ---------------------------------------------------------------- geometry

const FINGERS: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];

function fingerState(lm: Pt[]) {
  const wrist = lm[0];
  let fingers = 0;
  for (const [tip, pip] of FINGERS) if (dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.08) fingers++;
  const thumbOut = dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * 1.12 && dist(lm[4], lm[5]) > dist(lm[0], lm[9]) * 0.45;
  return { fingers, thumbOut };
}

export function toSymbol(g: GestureName, fingers: number, thumbOut: boolean): HandSymbol {
  switch (g) {
    case "Closed_Fist": return "fist";
    case "Victory": return "peace";
    case "Thumb_Up": return "thumb";
    case "ILoveYou": return "rock";
    case "Open_Palm": return fingers === 4 && !thumbOut ? "four" : "palm";
    case "Pointing_Up": return fingers <= 1 ? "one" : "none";
    default:
      if (fingers === 1) return "one";
      if (fingers === 3) return "three";
      if (fingers === 4 && !thumbOut) return "four";
      return "none";
  }
}

export function palmCenter(lm: Pt[]): Pt {
  const ids = [0, 5, 9, 13, 17];
  let x = 0, y = 0;
  for (const i of ids) { x += lm[i].x; y += lm[i].y; }
  return { x: x / ids.length, y: y / ids.length };
}

/** Quantize 21 landmarks to a flat 12-bit integer array (42 numbers) for game_pose. */
export function packPose(lm: Pt[]): number[] {
  const out: number[] = [];
  for (const p of lm) out.push(Math.round(clamp(p.x, 0, 1) * 4095), Math.round(clamp(p.y, 0, 1) * 4095));
  return out;
}
export function unpackPose(data: unknown): Pt[] | null {
  if (!Array.isArray(data) || data.length !== 42) return null;
  const out: Pt[] = [];
  for (let i = 0; i < 42; i += 2) {
    const x = Number(data[i]), y = Number(data[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push({ x: x / 4095, y: y / 4095 });
  }
  return out;
}

/** Zone based hand to player assignment (display space; left half = player 0). */
export function assignZones<T extends { wrist: Pt; score: number }>(hands: T[], players: number): (T | undefined)[] {
  const out: (T | undefined)[] = new Array(players).fill(undefined);
  if (players <= 1) {
    out[0] = hands.reduce<T | undefined>((b, h) => (!b || h.score > b.score ? h : b), undefined);
    return out;
  }
  const width = 1 / players;
  for (const h of hands) {
    const z = clamp(Math.floor(h.wrist.x / width), 0, players - 1);
    if (!out[z] || h.score > out[z]!.score) out[z] = h;
  }
  return out;
}

// ---------------------------------------------------------------- recognizer (shared singleton)

type Delegate = "GPU" | "CPU";
const shared: {
  rec: GestureRecognizer | null;
  promise: Promise<GestureRecognizer> | null;
  delegate: Delegate | null;
  refs: number;
  numHands: number;
  forceCpu: boolean;
} = { rec: null, promise: null, delegate: null, refs: 0, numHands: 1, forceCpu: false };

async function buildRecognizer(numHands: number, forceCpu: boolean): Promise<GestureRecognizer> {
  const { FilesetResolver, GestureRecognizer: Recognizer } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const make = (delegate: Delegate) =>
    Recognizer.createFromOptions(vision, {
      runningMode: "VIDEO",
      numHands,
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    }).then((r) => {
      shared.delegate = delegate;
      return r;
    });
  if (forceCpu) return make("CPU");
  try {
    return await make("GPU");
  } catch {
    return make("CPU");
  }
}

async function acquireRecognizer(numHands: number): Promise<void> {
  shared.refs++;
  shared.numHands = numHands;
  if (shared.rec) {
    await shared.rec.setOptions({ numHands });
    return;
  }
  if (!shared.promise) {
    shared.promise = buildRecognizer(numHands, shared.forceCpu)
      .then((r) => {
        if (shared.refs <= 0) {
          r.close();
          throw new Error("released");
        }
        shared.rec = r;
        return r;
      })
      .finally(() => {
        shared.promise = null;
      });
  }
  try {
    await shared.promise;
  } catch (e) {
    shared.refs = Math.max(0, shared.refs - 1);
    throw e;
  }
}

function releaseRecognizer() {
  shared.refs = Math.max(0, shared.refs - 1);
  if (shared.refs === 0 && shared.rec) {
    shared.rec.close();
    shared.rec = null;
    shared.delegate = null;
  }
}

async function switchToCpu() {
  if (shared.delegate === "CPU") return;
  shared.forceCpu = true;
  const old = shared.rec;
  const next = await buildRecognizer(shared.numHands, true);
  if (shared.refs <= 0) {
    next.close();
    return;
  }
  shared.rec = next;
  old?.close();
}

// ---------------------------------------------------------------- tracker

type PlayerState = {
  gestureVote: MajorityVote<GestureName>;
  symbolVote: MajorityVote<HandSymbol>;
  fx: OneEuro;
  fy: OneEuro;
  lastSeen: number;
  last: PlayerHand | null;
};

const emptyHand = (player: number): PlayerHand => ({
  player, present: false, raw: "None", rawSymbol: "none", score: 0, gesture: "None", symbol: "none",
  lm: [], wrist: { x: 0.5, y: 0.5 }, palm: { x: 0.5, y: 0.5 }, tip: { x: 0.5, y: 0.5 }, cursor: { x: 0.5, y: 0.5 },
  fingers: 0, thumbOut: false,
});

export class HandTracker {
  latest: HandFrame;
  status: TrackerStatus = "idle";
  fps = 0;
  /** True when measured FPS < 24: games widen hit radii and simplify effects. */
  lite = false;
  private listeners = new Set<(f: HandFrame) => void>();
  private statusListeners = new Set<(s: TrackerStatus) => void>();
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private lastInference = 0;
  private seq = 0;
  private acquired = false;
  private disposed = false;
  private windowStart = 0;
  private windowCount = 0;
  private slowSince = 0;
  private startedAt = 0;
  private switching = false;
  private errors = 0;
  private states: PlayerState[] = [];

  constructor(private opts: { players: number; numHands?: number }) {
    this.latest = { t: 0, seq: 0, players: [], handCount: 0 };
    this.setPlayers(opts.players);
  }

  get delegate() {
    return shared.delegate;
  }

  setPlayers(n: number) {
    this.opts.players = n;
    this.states = Array.from({ length: n }, () => ({
      gestureVote: new MajorityVote<GestureName>(5, "None"),
      symbolVote: new MajorityVote<HandSymbol>(5, "none"),
      fx: new OneEuro(), fy: new OneEuro(), lastSeen: 0, last: null,
    }));
    this.latest = { t: this.latest.t, seq: this.latest.seq, players: Array.from({ length: n }, (_, i) => emptyHand(i)), handCount: 0 };
    if (shared.rec) void shared.rec.setOptions({ numHands: this.numHands });
  }

  private get numHands() {
    return this.opts.numHands ?? Math.min(2, Math.max(1, this.opts.players));
  }

  onFrame(cb: (f: HandFrame) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  onStatus(cb: (s: TrackerStatus) => void) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }
  private setStatus(s: TrackerStatus) {
    this.status = s;
    this.statusListeners.forEach((c) => c(s));
  }

  /** Lazily creates (or reuses) the shared recognizer, then starts the detection loop. */
  async start(video: HTMLVideoElement) {
    if (this.disposed) return;
    this.video = video;
    this.setStatus("loading");
    try {
      if (!this.acquired) {
        await acquireRecognizer(this.numHands);
        this.acquired = true;
      }
    } catch (e) {
      if (!this.disposed) this.setStatus("error");
      throw e;
    }
    if (this.disposed) {
      this.release();
      return;
    }
    this.startedAt = performance.now();
    this.windowStart = this.startedAt;
    this.windowCount = 0;
    this.setStatus("running");
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Pauses detection (keeps the recognizer). Call start() again to resume. */
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastVideoTime = -1;
    if (this.status === "running") this.setStatus("idle");
  }

  private release() {
    if (this.acquired) {
      this.acquired = false;
      releaseRecognizer();
    }
  }

  /** Stops the loop and releases the shared recognizer (closed when nobody uses it). */
  dispose() {
    this.disposed = true;
    this.stop();
    this.listeners.clear();
    this.statusListeners.clear();
    this.release();
    this.setStatus("idle");
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const video = this.video;
    const rec = shared.rec;
    if (!video || !rec || document.hidden || video.readyState < 2 || this.switching) return;
    if (video.currentTime === this.lastVideoTime) return;
    const now = performance.now();
    if (now - this.lastInference < 30) return; // ~30 fps cap
    this.lastVideoTime = video.currentTime;
    this.lastInference = now;
    let result: GestureRecognizerResult;
    try {
      result = rec.recognizeForVideo(video, now);
      this.errors = 0;
    } catch {
      if (++this.errors > 8) {
        this.stop();
        this.setStatus("error");
      }
      return;
    }
    this.measure(now);
    this.process(result, now);
  };

  private measure(now: number) {
    this.windowCount++;
    if (now - this.windowStart < 1000) return;
    this.fps = (this.windowCount * 1000) / (now - this.windowStart);
    this.windowStart = now;
    this.windowCount = 0;
    if (now - this.startedAt < 2000) return; // warm up
    if (this.fps < 24) this.lite = true;
    else if (this.fps >= 28) this.lite = false;
    if (this.fps < 15 && shared.delegate === "GPU") {
      if (!this.slowSince) this.slowSince = now;
      if (now - this.slowSince >= 3000 && !this.switching) {
        this.switching = true;
        switchToCpu()
          .catch(() => undefined)
          .finally(() => {
            this.switching = false;
            this.slowSince = 0;
            this.startedAt = performance.now();
          });
      }
    } else {
      this.slowSince = 0;
    }
  }

  private process(result: GestureRecognizerResult, now: number) {
    type Raw = {
      lm: Pt[]; wrist: Pt; palm: Pt; raw: GestureName; score: number; fingers: number; thumbOut: boolean;
    };
    const raws: Raw[] = [];
    result.landmarks.forEach((marks, i) => {
      if (marks.length < 21) return;
      const lm = marks.map((p) => ({ x: 1 - p.x, y: p.y }));
      const top = result.gestures[i]?.[0];
      const { fingers, thumbOut } = fingerState(lm);
      raws.push({
        lm, wrist: lm[0], palm: palmCenter(lm),
        raw: ((top?.categoryName as GestureName) || "None"),
        score: top?.score ?? 0, fingers, thumbOut,
      });
    });
    const assigned = assignZones(raws, this.opts.players);
    const tSec = now / 1000;
    const players: PlayerHand[] = this.states.map((st, p) => {
      const h = assigned[p];
      if (!h) {
        if (now - st.lastSeen > 300) {
          st.fx.reset();
          st.fy.reset();
        }
        const prev = st.last;
        const out: PlayerHand = {
          ...(prev ?? emptyHand(p)), player: p, present: false, raw: "None", rawSymbol: "none",
          gesture: st.gestureVote.push("None"), symbol: st.symbolVote.push("none"),
        };
        // Hands that vanished for a long time are cleared, short drop-outs keep the last pose.
        if (now - st.lastSeen > 400) out.lm = [];
        return out;
      }
      st.lastSeen = now;
      const rawSymbol = toSymbol(h.raw, h.fingers, h.thumbOut);
      const tip = h.lm[8];
      const out: PlayerHand = {
        player: p, present: true, raw: h.raw, rawSymbol, score: h.score,
        gesture: st.gestureVote.push(h.raw), symbol: st.symbolVote.push(rawSymbol),
        lm: h.lm, wrist: h.wrist, palm: h.palm, tip,
        cursor: { x: st.fx.filter(tip.x, tSec), y: st.fy.filter(tip.y, tSec) },
        fingers: h.fingers, thumbOut: h.thumbOut,
      };
      st.last = out;
      return out;
    });
    const frame: HandFrame = { t: now, seq: ++this.seq, players, handCount: raws.length };
    this.latest = frame;
    this.listeners.forEach((cb) => cb(frame));
  }
}

// ---------------------------------------------------------------- camera

/** Same wording as useGestureCamera's cameraErrorMessage. */
export function cameraErrorMessage(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera access was not allowed. Open this site's permissions beside the address bar, allow Camera, then try again. Also check your device's camera privacy settings. If this page is embedded, open it in its own tab.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Connect or enable a camera, then try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your camera could not start. Close other apps using it and check your device's camera privacy settings, then try again.";
    case "OverconstrainedError":
      return "This camera could not provide a compatible preview. Try another camera or browser.";
    case "SecurityError":
      return "This browser has disabled camera access for this page. Check site permissions or open the page in its own browser tab.";
    case "AbortError":
      return "Camera startup was interrupted. Please try again.";
    default:
      return "The camera preview could not start. Check your camera connection and browser permissions, then try again.";
  }
}

export function cameraSupportError(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return "Camera access needs HTTPS or localhost. On this computer, use localhost instead of a network IP. For a phone or another device, use an HTTPS address.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera access is unavailable in this browser. Open this page in a current version of Chrome, Edge, Firefox, or Safari.";
  }
  return null;
}

export async function openCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const unsupported = cameraSupportError();
  if (unsupported) throw Object.assign(new Error(unsupported), { name: "UnsupportedError", friendly: unsupported });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: { ideal: "user" } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  return stream;
}

export function closeCamera(video: HTMLVideoElement | null, stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => {
    t.onended = null;
    t.stop();
  });
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

export function friendlyCameraError(cause: unknown): string {
  const friendly = (cause as { friendly?: string } | null)?.friendly;
  return friendly ?? cameraErrorMessage(cause);
}
