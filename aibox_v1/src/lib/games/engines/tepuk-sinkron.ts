import { COLORS, drawPoseLandmarks, panel, pill, text } from "../draw";
import { H, W, type Engine, type EngineEnv, type Hud } from "../engine";
import { packPose, unpackPose, type Pt } from "../hand-input";
import { encodeThumb, loadImage } from "../photo-moment";
import { clamp, lerp, mulberry32 } from "../util";

export const BEAT_COUNT = 8;
const LEAD_MS = 2600;
const WINDOW_MS = 200;
const REPORT_AFTER = 260;
const PARTNER_WAIT = 1800;
const POSE_HZ = 15;
const GHOST_DELAY = 100;
const ZONE_X = 0.62; // my target, in display space; the partner's ghost zone sits mirrored at 1 - ZONE_X
const ZONE_RX = 0.13;
const ZONE_RY = 0.18;

type Beat = {
  t: number; // server (or local) timestamp
  zy: number;
  mine?: { ok: boolean; t: number };
  theirs?: { ok: boolean; t: number };
  bestMineDt: number;
  bestMineT: number;
  reported: boolean;
  resolved: boolean;
  success: boolean;
  delta: number;
  popAt: number;
  label: string;
};

/** Interval and target heights are pure functions of the shared seed. */
export function beatSchedule(seed: number, startAt: number): { interval: number; beats: { t: number; zy: number }[] } {
  const rand = mulberry32(seed || 1);
  const interval = 2300 + (Math.abs(seed | 0) % 5) * 150;
  const beats = Array.from({ length: BEAT_COUNT }, (_, k) => ({ t: startAt + LEAD_MS + k * interval, zy: 0.4 + rand() * 0.2 }));
  return { interval, beats };
}

// Stylised open hand used by the practice partner, relative to the palm centre (units of hand size).
const TEMPLATE: [number, number][] = [
  [0, 0.9], [-0.55, 0.55], [-0.8, 0.3], [-0.95, 0.05], [-1.05, -0.15],
  [-0.35, -0.25], [-0.4, -0.65], [-0.42, -0.9], [-0.43, -1.15],
  [-0.05, -0.3], [-0.05, -0.75], [-0.05, -1.05], [-0.05, -1.3],
  [0.25, -0.25], [0.3, -0.65], [0.32, -0.9], [0.33, -1.1],
  [0.5, -0.15], [0.58, -0.45], [0.62, -0.62], [0.65, -0.8],
];
export function templateAt(cx: number, cy: number, scale = 1): Pt[] {
  return TEMPLATE.map(([dx, dy]) => ({ x: cx + dx * 0.085 * scale, y: cy + dy * 0.115 * scale }));
}

type PoseSample = { t: number; seq: number; lm: Pt[] | null };

export function createTepukSinkron(env: EngineEnv): Engine {
  const net = env.net;
  const remote = env.setup.where === "remote" && !!net;
  const practice = !remote;
  const { beats: sched } = beatSchedule(env.seed, env.startAt);
  const beats: Beat[] = sched.map((b) => ({
    ...b, bestMineDt: Infinity, bestMineT: 0, reported: false, resolved: false, success: false, delta: Infinity, popAt: 0, label: "",
  }));
  const thumbs = new Map<number, HTMLCanvasElement>();
  const rng = mulberry32((env.seed || 1) ^ 0x51ed);
  // practice partner plan: per-beat jitter and success
  const partnerPlan = beats.map(() => ({ jitter: (rng() - 0.5) * 180, hit: rng() < 0.85 }));
  let score = 0;
  let hits = 0;
  let streak = 0;
  let bestDelta = Infinity;
  let finished = false;
  let phase: "play" | "photo" = "play";
  let photoSentAt = 0;
  let sentBeat = -1;
  let partnerPhoto: { beat: number; jpeg: string } | null = null;
  const poses: PoseSample[] = [];
  let lastPoseSeq = -1;
  let sendSeq = 0;
  let lastPoseSent = 0;
  let lastWasPresent = false;
  const offs: (() => void)[] = [];
  const cancels: (() => void)[] = [];
  const now = () => env.clock.now();
  const liteScale = () => (env.tracker.lite ? 1.25 : 1);

  const inZone = (p: Pt, zy: number) => {
    const s = liteScale();
    const dx = (p.x - ZONE_X) / (ZONE_RX * s);
    const dy = (p.y - zy) / (ZONE_RY * s);
    return dx * dx + dy * dy <= 1;
  };

  function currentBeatIndex(t: number) {
    for (let k = 0; k < beats.length; k++) if (t < beats[k].t + 900) return k;
    return beats.length;
  }

  // sampling: open palm with the palm centre inside the zone, within +-200 ms of the beat
  offs.push(env.tracker.onFrame((f) => {
    const t = now();
    const hand = f.players[0];
    if (hand?.present) {
      for (const b of beats) {
        if (Math.abs(t - b.t) > WINDOW_MS) continue;
        if (hand.raw === "Open_Palm" && inZone(hand.palm, b.zy)) {
          const dt = Math.abs(t - b.t);
          if (dt < b.bestMineDt) { b.bestMineDt = dt; b.bestMineT = t; }
        }
      }
    }
    // ghost hand stream
    if (remote && net && performance.now() - lastPoseSent >= 1000 / POSE_HZ) {
      if (hand?.present && hand.lm.length === 21) {
        lastPoseSent = performance.now();
        net.pose({ p: packPose(hand.lm) }, ++sendSeq);
        lastWasPresent = true;
      } else if (lastWasPresent) {
        lastPoseSent = performance.now();
        net.pose({ p: null }, ++sendSeq);
        lastWasPresent = false;
      }
    }
  }));

  if (remote && net) {
    offs.push(net.on("pose", (m) => {
      if (m.seq <= lastPoseSeq && lastPoseSeq - m.seq < 1000) return;
      lastPoseSeq = m.seq;
      const d = m.data as { p?: unknown } | null;
      poses.push({ t: performance.now(), seq: m.seq, lm: d && d.p ? unpackPose(d.p) : null });
      if (poses.length > 24) poses.shift();
    }));
    const take = (m: { data: unknown; tCapture: number; from: string }) => {
      const d = m.data as { kind?: string; beat?: number; ok?: boolean; jpeg?: string } | null;
      if (!d || typeof d.beat !== "number") return;
      if (d.kind === "beat" && d.beat >= 0 && d.beat < beats.length) {
        beats[d.beat].theirs = { ok: !!d.ok, t: m.tCapture };
      } else if (d.kind === "photo" && typeof d.jpeg === "string" && d.jpeg.startsWith("data:image/")) {
        partnerPhoto = { beat: d.beat, jpeg: d.jpeg };
      }
    };
    net.inputLog.forEach(take);
    offs.push(net.on("input", take));
    // everybody captures a thumbnail at exactly the same server timestamp for every beat
    beats.forEach((b, k) => {
      cancels.push(net.at(b.t, () => {
        const c = env.moments?.captureThumb(480);
        if (c) thumbs.set(k, c);
      }));
    });
  }

  function resolveBeat(k: number) {
    const b = beats[k];
    b.resolved = true;
    const t = now();
    b.popAt = performance.now();
    if (!b.mine) b.mine = { ok: false, t: b.t };
    if (practice) {
      const plan = partnerPlan[k];
      b.theirs = { ok: plan.hit, t: b.t + plan.jitter };
    }
    const theirs = b.theirs;
    b.success = !!(b.mine.ok && theirs?.ok);
    b.delta = b.success && theirs ? Math.abs(b.mine.t - theirs.t) : Infinity;
    if (b.success) {
      hits++;
      streak++;
      bestDelta = Math.min(bestDelta, b.delta);
      const pts = Math.round(100 - clamp(b.delta, 0, 200) / 2) + (streak > 1 ? streak * 5 : 0);
      score += pts;
      b.label = b.delta < 80 ? "PERFECT" : b.delta < 160 ? "GREAT" : "SYNCED";
    } else {
      streak = 0;
      b.label = !b.mine.ok ? "MISSED" : theirs && !theirs.ok ? "PARTNER MISSED" : "NO SIGNAL";
    }
    void t;
  }

  function pickBestBeat() {
    let best = -1;
    let bd = Infinity;
    beats.forEach((b, k) => {
      if (b.success && b.delta < bd) { bd = b.delta; best = k; }
    });
    if (best >= 0) return best;
    const mineOk = beats.findIndex((b) => b.mine?.ok);
    return mineOk >= 0 ? mineOk : Math.floor(beats.length / 2);
  }

  let concluded = false;
  async function conclude() {
    if (concluded) return;
    concluded = true;
    finished = true;
    const best = partnerPhoto && thumbs.has(partnerPhoto.beat) ? partnerPhoto.beat : sentBeat >= 0 ? sentBeat : pickBestBeat();
    let mine = thumbs.get(best) ?? env.moments?.captureFull() ?? null;
    if (practice) {
      const k = pickBestBeat();
      mine = thumbs.get(k) ?? mine;
    }
    let right: HTMLCanvasElement | null = null;
    if (partnerPhoto) {
      try {
        const img = await loadImage(partnerPhoto.jpeg);
        right = document.createElement("canvas");
        right.width = img.naturalWidth;
        right.height = img.naturalHeight;
        right.getContext("2d")?.drawImage(img, 0, 0);
      } catch {
        right = null;
      }
    }
    const title = hits >= 6 ? "Perfectly in sync" : hits >= 3 ? "Getting in sync" : "Almost there";
    env.finish({
      outcome: "done",
      title,
      subtitle: practice
        ? `Practice run: ${hits} of ${BEAT_COUNT} beats landed with the virtual partner.`
        : `${hits} of ${BEAT_COUNT} beats landed together${Number.isFinite(bestDelta) ? `, best sync ${Math.round(bestDelta)} ms` : ""}.`,
      stamp: { text: `${hits}/${BEAT_COUNT} SYNCED`, tone: hits >= 3 ? "gold" : "draw" },
      stats: [
        { label: "Synced", value: `${hits}/${BEAT_COUNT}` },
        { label: "Best sync", value: Number.isFinite(bestDelta) ? `${Math.round(bestDelta)} ms` : "-" },
        { label: "Score", value: String(score) },
      ],
      photo: right ? null : mine,
      split: right && mine ? { left: mine, right } : null,
      burst: env.moments?.recent() ?? [],
      drawOverlay: right ? (g, rect) => seamBurst(g, rect) : undefined,
    });
  }

  function update() {
    if (finished) return;
    const t = now();
    if (phase === "play") {
      beats.forEach((b, k) => {
        if (practice && !thumbs.has(k) && t >= b.t) {
          const c = env.moments?.captureThumb(480);
          if (c) thumbs.set(k, c);
        }
        if (!b.reported && t >= b.t + REPORT_AFTER) {
          b.reported = true;
          const ok = b.bestMineDt <= WINDOW_MS;
          b.mine = { ok, t: ok ? b.bestMineT : b.t };
          if (remote && net) net.input({ kind: "beat", beat: k, ok }, b.mine.t);
        }
        if (b.reported && !b.resolved) {
          if (practice || b.theirs || t >= b.t + REPORT_AFTER + PARTNER_WAIT) resolveBeat(k);
        }
      });
      if (beats.every((b) => b.resolved)) {
        if (remote && net) {
          phase = "photo";
          photoSentAt = performance.now();
          const k = pickBestBeat();
          sentBeat = k;
          const c = thumbs.get(k);
          if (c) net.input({ kind: "photo", beat: k, jpeg: encodeThumb(c, 480, 48000) });
        } else {
          void conclude();
        }
      }
      if (remote && net && t > beats[0].t && net.others().length === 0) {
        phase = "photo";
        photoSentAt = performance.now() - 5000;
      }
    } else if (phase === "photo") {
      const waited = performance.now() - photoSentAt;
      if (partnerPhoto || waited > 6000) {
        void conclude();
      }
    }
  }

  // ---- ghost hand
  function ghostLandmarks(t: number): { lm: Pt[]; alpha: number } | null {
    if (practice) {
      // virtual partner glides in for each beat, then rests low at the left
      const rest = { x: 0.14, y: 0.82 };
      let target = rest;
      let k = currentBeatIndex(t - 600);
      if (k >= beats.length) k = beats.length - 1;
      for (let i = Math.max(0, k - 1); i <= Math.min(beats.length - 1, k + 1); i++) {
        const plan = partnerPlan[i];
        const arrive = beats[i].t + plan.jitter;
        const start = arrive - 800;
        const hold = arrive + 450;
        const goal = plan.hit ? { x: 1 - ZONE_X, y: beats[i].zy } : { x: 1 - ZONE_X - 0.18, y: beats[i].zy + 0.2 };
        if (t >= start && t < arrive) {
          const u = (t - start) / 800;
          const e = u * u * (3 - 2 * u);
          target = { x: lerp(rest.x, goal.x, e), y: lerp(rest.y, goal.y, e) };
        } else if (t >= arrive && t < hold) target = goal;
        else if (t >= hold && t < hold + 600) {
          const u = (t - hold) / 600;
          target = { x: lerp(goal.x, rest.x, u), y: lerp(goal.y, rest.y, u) };
        }
      }
      return { lm: templateAt(target.x, target.y), alpha: 0.7 };
    }
    if (!poses.length) return null;
    const rt = performance.now() - GHOST_DELAY;
    let a = poses[0];
    let b = poses[poses.length - 1];
    for (let i = 0; i < poses.length - 1; i++) {
      if (poses[i].t <= rt && poses[i + 1].t >= rt) { a = poses[i]; b = poses[i + 1]; break; }
    }
    if (rt >= poses[poses.length - 1].t) { a = b = poses[poses.length - 1]; }
    const last = poses[poses.length - 1];
    if (!a.lm || !b.lm) {
      return last.lm && rt - last.t < 250 ? { lm: last.lm.map((p) => ({ x: 1 - p.x, y: p.y })), alpha: 0.55 } : null;
    }
    const span = Math.max(1, b.t - a.t);
    const u = a === b ? 0 : clamp((rt - a.t) / span, 0, 1);
    // never extrapolate beyond the newest sample; fade after 250 ms of silence
    const silence = rt - last.t;
    const alpha = silence > 250 ? clamp(1 - (silence - 250) / 250, 0, 1) : 0.75;
    if (alpha <= 0) return null;
    return { lm: a.lm.map((p, i) => ({ x: 1 - lerp(p.x, b.lm![i].x, u), y: lerp(p.y, b.lm![i].y, u) })), alpha };
  }

  function draw(g: CanvasRenderingContext2D) {
    const t = now();
    g.fillStyle = "rgba(14,17,22,.34)";
    g.fillRect(0, 0, W, H);
    // centre seam
    g.strokeStyle = "rgba(255,255,255,.28)";
    g.setLineDash([10, 12]);
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.setLineDash([]);

    const ghost = ghostLandmarks(t);
    if (ghost) drawPoseLandmarks(g, ghost.lm, COLORS.accent, ghost.alpha);
    else if (remote && t > env.startAt) pill(g, "waiting for your partner's hand", W * 0.28, H - 52, COLORS.muted);

    const k = Math.min(currentBeatIndex(t), beats.length - 1);
    const b = beats[k];
    const s = liteScale();
    if (t < b.t + 700 && phase === "play") {
      const cx = ZONE_X * W, cy = b.zy * H, rx = ZONE_RX * W * s, ry = ZONE_RY * H * s;
      const toBeat = b.t - t;
      const inWin = Math.abs(toBeat) <= WINDOW_MS;
      const hand = env.tracker.latest.players[0];
      const hot = !!hand?.present && hand.raw === "Open_Palm" && inZone(hand.palm, b.zy);
      // target zone
      g.save();
      g.strokeStyle = hot ? COLORS.win : COLORS.accent;
      g.lineWidth = inWin ? 8 : 4;
      g.setLineDash(inWin ? [] : [14, 10]);
      g.fillStyle = hot ? "rgba(61,220,151,.22)" : "rgba(255,171,40,.12)";
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.setLineDash([]);
      // closing ring: the beat lands when the ring meets the zone
      if (toBeat > -WINDOW_MS && toBeat < 1400) {
        const u = clamp(toBeat / 1400, 0, 1);
        g.globalAlpha = 0.9;
        g.strokeStyle = "#fff";
        g.lineWidth = 4;
        g.beginPath(); g.ellipse(cx, cy, rx * (1 + u * 1.6), ry * (1 + u * 1.6), 0, 0, Math.PI * 2); g.stroke();
      }
      g.restore();
      text(g, "PALM HERE", cx, cy - ry - 14, { size: 20, mono: true, weight: 500, align: "center", color: COLORS.accent });
      // partner's mirrored zone
      g.save();
      g.strokeStyle = "rgba(255,171,40,.5)";
      g.setLineDash([6, 10]);
      g.lineWidth = 3;
      g.beginPath(); g.ellipse((1 - ZONE_X) * W, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
      if (toBeat > 0) text(g, toBeat < 600 ? "NOW" : "get ready", W / 2, 90, { size: toBeat < 600 ? 84 : 44, weight: 700, align: "center", color: toBeat < 600 ? COLORS.accent : COLORS.muted });
      else if (inWin) text(g, "TEPUK!", W / 2, 100, { size: 100, weight: 700, align: "center", color: COLORS.accent });
    }
    // beat result pop
    for (const bb of beats) {
      const age = (performance.now() - bb.popAt) / 1100;
      if (!bb.popAt || age > 1) continue;
      g.globalAlpha = 1 - age;
      text(g, bb.label, W / 2, H * 0.4 - age * 50, { size: 70, weight: 700, align: "center", color: bb.success ? COLORS.win : COLORS.lose });
      g.globalAlpha = 1;
    }
    // beat pips
    const pip = 26;
    const x0 = W / 2 - (beats.length * (pip + 8)) / 2;
    beats.forEach((bb, i) => {
      const x = x0 + i * (pip + 8) + pip / 2;
      g.fillStyle = bb.resolved ? (bb.success ? COLORS.win : COLORS.lose) : i === k ? COLORS.accent : "rgba(255,255,255,.3)";
      g.beginPath(); g.arc(x, H - 24, 9, 0, Math.PI * 2); g.fill();
    });
    if (t < beats[0].t - 800) {
      const sec = Math.max(1, Math.ceil((beats[0].t - 800 - t) / 1000));
      if (t < env.startAt + 1800) {
        panel(g, W / 2 - 330, H * 0.18, 660, 130, 18, "rgba(14,17,22,.8)");
        text(g, "Raise an open palm into the ring on every beat.", W / 2, H * 0.18 + 54, { size: 30, align: "center", shadow: false });
        text(g, practice ? "Your virtual partner will meet you in the middle." : "Your partner's hand appears on the left side.", W / 2, H * 0.18 + 96, { size: 24, align: "center", color: COLORS.muted, shadow: false });
      }
      text(g, String(sec), W / 2, H * 0.56, { size: 150, weight: 700, align: "center", color: COLORS.accent });
    }
    if (phase === "photo") {
      panel(g, W / 2 - 280, H / 2 - 70, 560, 140, 18, "rgba(14,17,22,.85)", COLORS.accent);
      text(g, "Developing your high-five photo...", W / 2, H / 2 + 12, { size: 34, weight: 600, align: "center", shadow: false });
    }
  }

  function hud(): Hud {
    return {
      players: [{ name: practice ? "You + virtual partner" : "Duo sync", score, color: COLORS.accent, sub: `${hits}/${BEAT_COUNT} beats` }],
      label: `Beat ${Math.min(currentBeatIndex(now()) + 1, BEAT_COUNT)} / ${BEAT_COUNT}`,
      hint: "Open palm inside the ring on the beat. Both of you must land it.",
    };
  }

  return {
    skeleton: "full",
    update,
    draw,
    hud,
    destroy() {
      finished = true;
      concluded = true;
      offs.forEach((o) => o());
      cancels.forEach((c) => c());
      thumbs.forEach((c) => { c.width = c.height = 0; });
      thumbs.clear();
    },
  };
}

function seamBurst(g: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h * 0.45;
  g.save();
  g.beginPath();
  g.rect(rect.x, rect.y, rect.w, rect.h);
  g.clip();
  g.translate(cx, cy);
  g.strokeStyle = "#ffab28";
  g.lineWidth = 8;
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 70, Math.sin(a) * 70);
    g.lineTo(Math.cos(a) * (110 + (i % 2) * 30), Math.sin(a) * (110 + (i % 2) * 30));
    g.stroke();
  }
  g.fillStyle = "rgba(14,17,22,.75)";
  g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#ffab28"; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#ffab28";
  g.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText("TEPUK", 0, 4);
  g.fillText("!", 0, 36);
  g.restore();
}
