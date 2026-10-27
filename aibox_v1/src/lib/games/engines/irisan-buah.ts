import { COLORS, PLAYER_COLORS, panel, text } from "../draw";
import { H, W, type Engine, type EngineEnv, type Hud } from "../engine";
import { clamp, mulberry32 } from "../util";

// ---------------------------------------------------------------- fruit art (canvas shapes only)

export type FruitKind = "mangga" | "rambutan" | "nanas" | "manggis" | "salak" | "bomb";
const FRUITS: FruitKind[] = ["mangga", "rambutan", "nanas", "manggis", "salak"];
const RADIUS: Record<FruitKind, number> = { mangga: 50, rambutan: 42, nanas: 56, manggis: 44, salak: 46, bomb: 42 };
const JUICE: Record<FruitKind, string[]> = {
  mangga: ["#ffc83a", "#ff9d2e", "#ffe27a"],
  rambutan: ["#ff4d5e", "#f6f1e0", "#d11f33"],
  nanas: ["#ffd84a", "#f0a91c", "#fff0a0"],
  manggis: ["#9b3fb8", "#ffe9ee", "#6a1f86"],
  salak: ["#c28a4f", "#f0dba8", "#8a5a30"],
  bomb: ["#ff3b30", "#ff9f1a", "#ffd23a"],
};
const FLESH: Record<FruitKind, string> = {
  mangga: "#ffc83a", rambutan: "#f6f1e0", nanas: "#ffe27a", manggis: "#fff1ef", salak: "#f6e7c1", bomb: "#ff9f1a",
};

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

export function drawFruit(g: CanvasRenderingContext2D, kind: FruitKind, r: number, time = 0) {
  switch (kind) {
    case "mangga": {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
      gr.addColorStop(0, "#ffe27a");
      gr.addColorStop(0.55, "#ffa83a");
      gr.addColorStop(1, "#e24a2a");
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, r * 1.1, r * 0.88, -0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3f8f3a";
      g.beginPath();
      g.moveTo(r * 0.35, -r * 0.78);
      g.quadraticCurveTo(r * 1.0, -r * 1.3, r * 1.25, -r * 0.7);
      g.quadraticCurveTo(r * 0.8, -r * 0.65, r * 0.35, -r * 0.78);
      g.fill();
      break;
    }
    case "rambutan": {
      g.strokeStyle = "#e8c93a";
      g.lineWidth = 3;
      g.lineCap = "round";
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const x1 = Math.cos(a) * r * 0.9, y1 = Math.sin(a) * r * 0.9;
        const x2 = Math.cos(a + 0.18) * r * 1.22, y2 = Math.sin(a + 0.18) * r * 1.22;
        g.strokeStyle = i % 2 ? "#c6162b" : "#e23b4d";
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.strokeStyle = "#a6c93a";
        g.beginPath();
        g.moveTo(x2 - Math.cos(a + 0.18) * 3, y2 - Math.sin(a + 0.18) * 3);
        g.lineTo(x2, y2);
        g.stroke();
      }
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      gr.addColorStop(0, "#ff6b78");
      gr.addColorStop(1, "#a30f1f");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case "nanas": {
      g.fillStyle = "#2f8a3d";
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(i * r * 0.1, -r * 0.85);
        g.lineTo(i * r * 0.32, -r * (1.55 - Math.abs(i) * 0.1));
        g.lineTo(i * r * 0.1 + r * 0.14, -r * 0.85);
        g.fill();
      }
      const gr = g.createLinearGradient(-r, -r, r, r);
      gr.addColorStop(0, "#ffd84a");
      gr.addColorStop(1, "#d98a12");
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, r * 0.82, r * 1.02, 0, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.ellipse(0, 0, r * 0.82, r * 1.02, 0, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = "rgba(120,70,0,.5)";
      g.lineWidth = 2;
      for (let i = -6; i <= 6; i++) {
        g.beginPath(); g.moveTo(i * r * 0.28 - r, -r * 1.1); g.lineTo(i * r * 0.28 + r, r * 1.1); g.stroke();
        g.beginPath(); g.moveTo(i * r * 0.28 + r, -r * 1.1); g.lineTo(i * r * 0.28 - r, r * 1.1); g.stroke();
      }
      g.restore();
      break;
    }
    case "manggis": {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
      gr.addColorStop(0, "#a755c4");
      gr.addColorStop(0.6, "#6a1f86");
      gr.addColorStop(1, "#33093f");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3f8f3a";
      star(g, 0, -r * 0.82, r * 0.36, 4, 0.5);
      g.fill();
      g.fillStyle = "rgba(255,255,255,.18)";
      g.beginPath();
      g.ellipse(-r * 0.38, -r * 0.3, r * 0.16, r * 0.3, 0.5, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case "salak": {
      const gr = g.createLinearGradient(-r, -r, r, r);
      gr.addColorStop(0, "#9a6234");
      gr.addColorStop(1, "#4a2a16");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, -r * 1.12);
      g.bezierCurveTo(r * 1.0, -r * 0.5, r * 0.95, r * 0.95, 0, r * 0.95);
      g.bezierCurveTo(-r * 0.95, r * 0.95, -r * 1.0, -r * 0.5, 0, -r * 1.12);
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = "rgba(30,15,5,.55)";
      g.lineWidth = 2;
      for (let row = -4; row <= 4; row++) {
        for (let col = -3; col <= 3; col++) {
          const x = col * r * 0.3 + (row % 2 ? r * 0.15 : 0), y = row * r * 0.26;
          g.beginPath();
          g.arc(x, y, r * 0.17, 0.1, Math.PI - 0.1);
          g.stroke();
        }
      }
      g.restore();
      break;
    }
    case "bomb": {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
      gr.addColorStop(0, "#ff6a4d");
      gr.addColorStop(0.5, "#c0111f");
      gr.addColorStop(1, "#4d0610");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      // chili silhouette
      g.fillStyle = "#ffd0c4";
      g.beginPath();
      g.moveTo(-r * 0.45, -r * 0.15);
      g.quadraticCurveTo(r * 0.2, -r * 0.5, r * 0.5, r * 0.35);
      g.quadraticCurveTo(r * 0.05, r * 0.05, -r * 0.45, -r * 0.15);
      g.fill();
      g.strokeStyle = "#3d2412";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(0, -r * 0.95);
      g.quadraticCurveTo(r * 0.25, -r * 1.35, r * 0.55, -r * 1.3);
      g.stroke();
      const pulse = 0.7 + 0.3 * Math.sin(time * 18);
      g.fillStyle = `rgba(255,210,58,${pulse})`;
      star(g, r * 0.58, -r * 1.3, r * 0.3 * pulse, 5, 0.4);
      g.fill();
      text(g, "!", 0, r * 0.28, { size: r * 0.8, weight: 800, align: "center", color: "#fff", shadow: false });
      break;
    }
  }
}

function drawHalf(g: CanvasRenderingContext2D, kind: FruitKind, r: number, side: -1 | 1) {
  g.save();
  g.beginPath();
  if (side < 0) g.rect(-r * 2, -r * 2, r * 2, r * 4);
  else g.rect(0, -r * 2, r * 2, r * 4);
  g.clip();
  drawFruit(g, kind, r);
  g.restore();
  g.fillStyle = FLESH[kind];
  g.fillRect(side < 0 ? -5 : -1, -r * 0.95, 6, r * 1.9);
}

// ---------------------------------------------------------------- deterministic spawns

const GRAVITY = 1250;
export const GAME_MS = 60_000;
const LEAD_MS = 1500;

export type Spawn = { id: number; t: number; kind: FruitKind; x0: number; vx: number; vy: number; spin: number; lane: number };

/** The same seed always yields the same list, so two devices can race on identical fruit. */
export function buildSchedule(seed: number, lane: number, lanes: number, durationMs = GAME_MS): Spawn[] {
  const rand = mulberry32((seed ^ 0x9e3779b9) + lane * 7919);
  const laneW = W / lanes;
  const lx = lane * laneW;
  const out: Spawn[] = [];
  let t = 900;
  let id = 0;
  while (t < durationMs - 1400) {
    const progress = t / durationMs;
    const burst = rand() < 0.28 + progress * 0.2 ? 2 + (rand() < 0.35 ? 1 : 0) : 1;
    for (let b = 0; b < burst; b++) {
      const bomb = t > 4000 && rand() < 0.15;
      const kind: FruitKind = bomb ? "bomb" : FRUITS[Math.floor(rand() * FRUITS.length)];
      const vy = -(900 + rand() * 230);
      const vx = (rand() - 0.5) * 240;
      const apexX = lx + 110 + rand() * (laneW - 220);
      const tApex = -vy / GRAVITY;
      out.push({
        id: id++, t: t + b * 120, kind, x0: apexX - vx * tApex, vx, vy,
        spin: (rand() - 0.5) * 7, lane,
      });
    }
    t += (700 - progress * 280) * (0.75 + rand() * 0.5);
  }
  return out;
}

type Item = Spawn & {
  sliced: boolean;
  sliceAt: number;
  sx: number;
  sy: number;
  rot0: number;
  exploded: boolean;
};

const posAt = (s: Spawn, gt: number) => {
  const tau = (gt - s.t) / 1000;
  return { x: s.x0 + s.vx * tau, y: H + 70 + s.vy * tau + 0.5 * GRAVITY * tau * tau };
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string };
type Floater = { x: number; y: number; text: string; color: string; born: number; size: number };

type PlayerStat = { score: number; combo: number; lastAt: number; peak: number; slices: number; bombs: number; peakKinds: FruitKind[]; recent: FruitKind[] };

function segDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function createIrisanBuah(env: EngineEnv): Engine {
  const net = env.net;
  const remote = env.setup.where === "remote" && !!net;
  const lanes = !remote && env.setup.players === 2 ? 2 : 1;
  const T0 = env.startAt + LEAD_MS;
  const items: Item[] = [];
  for (let l = 0; l < lanes; l++) {
    buildSchedule(env.seed, l, lanes).forEach((s) => items.push({ ...s, id: items.length, sliced: false, sliceAt: 0, sx: 0, sy: 0, rot0: s.spin * 0.3, exploded: false }));
  }
  items.sort((a, b) => a.t - b.t);
  const stats: PlayerStat[] = Array.from({ length: lanes }, () => ({
    score: 0, combo: 0, lastAt: -9999, peak: 0, slices: 0, bombs: 0, peakKinds: [], recent: [],
  }));
  const blades = Array.from({ length: lanes }, () => ({ last: null as null | { x: number; y: number; t: number }, trail: [] as { x: number; y: number; t: number }[] }));
  const particles: Particle[] = [];
  const floaters: Floater[] = [];
  let peakFrame: HTMLCanvasElement | null = null;
  let peakAt = -9999;
  let shake = 0;
  let flash = 0;
  let flashColor = "#ff3b30";
  let finished = false;
  let endedAt = 0;
  let lastScoreSent = -1;
  let lastSend = 0;
  let pointerDown = false;
  const allSlices = { fruit: 0 };

  const gameTime = () => env.clock.now() - T0;

  function burst(x: number, y: number, kind: FruitKind, n: number) {
    const count = env.reduced ? Math.ceil(n / 3) : env.tracker.lite ? Math.ceil(n * 0.6) : n;
    const colors = JUICE[kind];
    for (let i = 0; i < count && particles.length < 320; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 380;
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, life: 0, max: 0.5 + Math.random() * 0.6,
        r: 3 + Math.random() * 6, color: colors[i % colors.length],
      });
    }
  }

  function addScore(lane: number, pts: number, x: number, y: number, label?: string, color: string = COLORS.ink) {
    const st = stats[lane];
    st.score = Math.max(0, st.score + pts);
    floaters.push({ x, y, text: label ?? `+${pts}`, color, born: performance.now(), size: label ? 40 : 30 });
  }

  function slice(lane: number, it: Item, gt: number, hx: number, hy: number) {
    const st = stats[lane];
    const nowMs = performance.now();
    it.sliced = true;
    it.sliceAt = gt;
    const p = posAt(it, gt);
    it.sx = p.x;
    it.sy = p.y;
    if (it.kind === "bomb") {
      st.bombs++;
      st.combo = 0;
      shake = env.reduced ? 0 : 1;
      flash = 1;
      flashColor = "#ff3b30";
      it.exploded = true;
      burst(p.x, p.y, "bomb", 40);
      addScore(lane, -15, p.x, p.y - 30, "SAMBAL! -15", COLORS.lose);
      return;
    }
    st.slices++;
    allSlices.fruit++;
    st.combo = gt - st.lastAt <= 900 ? st.combo + 1 : 1;
    st.lastAt = gt;
    st.recent.push(it.kind);
    if (st.recent.length > 8) st.recent.shift();
    const pts = 10 + (st.combo > 1 ? Math.min(st.combo - 1, 9) * 3 : 0);
    burst(p.x, p.y, it.kind, 22);
    addScore(lane, pts, p.x, p.y - 20, st.combo > 1 ? `x${st.combo}  +${pts}` : undefined, st.combo > 1 ? COLORS.accent : COLORS.ink);
    void hx; void hy;
    if (st.combo > st.peak) {
      st.peak = st.combo;
      st.peakKinds = st.recent.slice(-Math.min(st.combo, 5));
      if (st.combo >= 3 && lane === 0 && nowMs - peakAt > 700) {
        peakAt = nowMs;
        const f = env.moments?.captureFull();
        if (f) peakFrame = f;
      }
    }
  }

  function moveBlade(lane: number, x: number, y: number, gt: number, lagMs: number) {
    const b = blades[lane];
    const last = b.last;
    b.last = { x, y, t: gt };
    b.trail.push({ x, y, t: gt });
    while (b.trail.length && gt - b.trail[0].t > 240) b.trail.shift();
    if (!last) return;
    const dt = gt - last.t;
    if (dt <= 0 || dt > 200) return;
    const len = Math.hypot(x - last.x, y - last.y);
    if (len < 6 || len > 380) return;
    if (len / dt < 0.28) return; // resting finger, not a swipe
    const slack = 22 + (env.tracker.lite ? 14 : 0);
    const probe = gt - lagMs - 0;
    for (const it of items) {
      if (it.sliced || it.lane !== lane || it.t > probe) continue;
      const pos = posAt(it, probe);
      if (pos.y > H + 90 && probe > it.t + 400) continue;
      if (pos.y < -120) continue;
      const rad = RADIUS[it.kind] + (it.kind === "bomb" ? slack * 0.35 : slack);
      if (segDistance(pos.x, pos.y, last.x, last.y, x, y) <= rad) slice(lane, it, gt, x, y);
    }
  }

  const offFrame = env.tracker.onFrame((f) => {
    if (finished) return;
    const gt = gameTime();
    if (gt < 0 || gt > GAME_MS) return;
    for (let l = 0; l < lanes; l++) {
      const hand = f.players[l];
      if (!hand?.present) { blades[l].last = null; continue; }
      moveBlade(l, hand.cursor.x * W, hand.cursor.y * H, gt, 70);
    }
  });

  function conclude() {
    if (finished) return;
    finished = true;
    const me = stats[0];
    const photo = peakFrame ?? env.moments?.captureFull() ?? null;
    const total = stats.reduce((a, s) => a + s.score, 0);
    const kinds = me.peakKinds.length ? me.peakKinds : (["mangga", "rambutan", "manggis"] as FruitKind[]);
    let ranking: { name: string; score: number; me?: boolean }[] | undefined;
    if (remote && net) {
      ranking = [{ name: net.name || "You", score: me.score, me: true }];
      net.others().forEach((p) => ranking!.push({ name: p.name, score: net.scores.get(p.id)?.score ?? 0 }));
      net.peers.filter((p) => p.id !== net.you && !p.connected && net.scores.has(p.id)).forEach((p) => ranking!.push({ name: p.name, score: net.scores.get(p.id)!.score }));
      ranking.sort((a, b) => b.score - a.score);
    } else if (lanes === 2) {
      ranking = [
        { name: "Player 1", score: stats[0].score, me: true },
        { name: "Player 2", score: stats[1].score },
      ].sort((a, b) => b.score - a.score);
    }
    const top = ranking?.[0];
    const iWon = remote ? top?.me === true : false;
    env.finish({
      outcome: remote ? (iWon ? "win" : "lose") : "done",
      title: lanes === 2 ? `${top?.name} slices the most` : remote ? (iWon ? "You sliced the most" : `${top?.name ?? "A friend"} sliced the most`) : "Fruit salad served",
      subtitle: `Best combo x${Math.max(me.peak, 1)}${lanes === 2 ? ` for Player 1, x${Math.max(stats[1].peak, 1)} for Player 2` : ""}. ${me.bombs ? `${me.bombs} sambal bomb${me.bombs > 1 ? "s" : ""} hit.` : "No sambal bombs hit."}`,
      stamp: { text: `x${Math.max(me.peak, 1)} COMBO`, tone: "gold" },
      stats: [
        { label: "Score", value: String(lanes === 2 ? `${stats[0].score}/${stats[1].score}` : me.score) },
        { label: "Best combo", value: `x${Math.max(me.peak, 1)}` },
        { label: "Fruit sliced", value: String(stats.reduce((a, s) => a + s.slices, 0)) },
        { label: "Sambal", value: String(stats.reduce((a, s) => a + s.bombs, 0)) },
      ],
      photo,
      burst: env.moments?.recent() ?? [],
      ranking,
      drawOverlay: (g, rect) => splash(g, rect, kinds, me.peak),
    });
    void total;
  }

  function update() {
    if (finished) return;
    const gt = gameTime();
    if (gt >= GAME_MS) {
      if (!endedAt) {
        endedAt = performance.now();
        if (net) {
          net.score(stats[0].score, true);
          lastScoreSent = stats[0].score;
        }
      }
      const waited = performance.now() - endedAt;
      if (remote && net) {
        const others = net.others();
        const allFinal = others.every((p) => net.scores.get(p.id)?.final);
        if ((allFinal && waited > 1200) || waited > 6000) conclude();
      } else if (waited > 1400) conclude();
      return;
    }
    if (remote && net && gt > 0 && performance.now() - lastSend > 800 && lastScoreSent !== stats[0].score) {
      lastSend = performance.now();
      lastScoreSent = stats[0].score;
      net.score(stats[0].score);
    }
    if (remote && net && gt > 3000 && net.others().length === 0) {
      // everyone else left: finish the run on our own
      conclude();
    }
  }

  const trailColor = (lane: number) => (lanes === 2 ? PLAYER_COLORS[lane] : "#bfe0ff");

  function draw(g: CanvasRenderingContext2D) {
    const gt = gameTime();
    const secs = performance.now() / 1000;
    g.save();
    if (shake > 0.02 && !env.reduced) {
      g.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 18 * shake);
      shake *= 0.9;
    }
    g.fillStyle = "rgba(14,17,22,.34)";
    g.fillRect(-20, -20, W + 40, H + 40);
    if (lanes === 2) {
      g.strokeStyle = "rgba(255,255,255,.4)";
      g.setLineDash([12, 10]);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      g.setLineDash([]);
    }

    // items
    for (const it of items) {
      if (it.t > gt + 50 || gt < 0) break;
      if (it.sliced) continue;
      const p = posAt(it, gt);
      if (gt > it.t + 600 && p.y > H + 100) continue;
      if (p.y > H + 120 && gt - it.t < 400) continue;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(it.rot0 + (it.spin * (gt - it.t)) / 1000);
      drawFruit(g, it.kind, RADIUS[it.kind], secs);
      g.restore();
    }
    // sliced halves
    for (const it of items) {
      if (!it.sliced || it.exploded) continue;
      const dt = (gt - it.sliceAt) / 1000;
      if (dt < 0 || dt > 1.2) continue;
      const r = RADIUS[it.kind];
      for (const side of [-1, 1] as const) {
        g.save();
        g.globalAlpha = clamp(1.2 - dt, 0, 1);
        const vy0 = it.vy + GRAVITY * ((it.sliceAt - it.t) / 1000);
        g.translate(it.sx + side * (70 * dt + 4) + it.vx * dt * 0.5, it.sy + vy0 * dt * 0.6 + 0.5 * GRAVITY * 0.8 * dt * dt);
        g.rotate(it.rot0 + it.spin * (it.sliceAt - it.t) / 1000 + side * dt * 2.2);
        drawHalf(g, it.kind, r, side);
        g.restore();
      }
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += 1 / 60;
      if (p.life >= p.max) { particles.splice(i, 1); continue; }
      p.vy += 900 / 60;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      g.globalAlpha = 1 - p.life / p.max;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // blade trails
    for (let l = 0; l < lanes; l++) {
      const tr = blades[l].trail;
      if (tr.length < 2) continue;
      for (let i = 1; i < tr.length; i++) {
        const age = gt - tr[i].t;
        const a = clamp(1 - age / 240, 0, 1);
        g.strokeStyle = trailColor(l);
        g.globalAlpha = a;
        g.lineWidth = 3 + a * 9;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(tr[i - 1].x, tr[i - 1].y);
        g.lineTo(tr[i].x, tr[i].y);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    // floaters
    const nowMs = performance.now();
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      const age = (nowMs - f.born) / 900;
      if (age >= 1) { floaters.splice(i, 1); continue; }
      g.globalAlpha = 1 - age;
      text(g, f.text, f.x, f.y - age * 60, { size: f.size, weight: 700, align: "center", color: f.color });
    }
    g.globalAlpha = 1;
    if (flash > 0.02) {
      g.fillStyle = flashColor;
      g.globalAlpha = flash * 0.35;
      g.fillRect(-20, -20, W + 40, H + 40);
      g.globalAlpha = 1;
      flash *= 0.88;
    }
    g.restore();

    // overlays: countdown and time up
    if (gt < 0) {
      text(g, String(Math.max(1, Math.ceil(-gt / 1000))), W / 2, H * 0.5, { size: 190, weight: 700, align: "center", color: COLORS.accent });
      text(g, "Swipe your index finger through the fruit. Avoid the sambal bomb.", W / 2, H * 0.66, { size: 26, align: "center", color: COLORS.muted });
    } else if (gt >= GAME_MS) {
      text(g, "TIME!", W / 2, H * 0.48, { size: 140, weight: 700, align: "center", color: COLORS.accent });
      if (remote) text(g, "Waiting for friends to finish", W / 2, H * 0.6, { size: 28, align: "center", color: COLORS.muted });
    }
    // combo chip
    for (let l = 0; l < lanes; l++) {
      const st = stats[l];
      if (st.combo >= 2 && gt - st.lastAt < 1200) {
        const cx = lanes === 2 ? W * (0.25 + 0.5 * l) : W / 2;
        panel(g, cx - 90, H - 86, 180, 52, 26, "rgba(14,17,22,.75)", COLORS.accent);
        text(g, `COMBO x${st.combo}`, cx, H - 51, { size: 28, weight: 700, align: "center", color: COLORS.accent, shadow: false });
      }
    }
  }

  function hud(): Hud {
    const gt = gameTime();
    const left = clamp(Math.ceil((GAME_MS - Math.max(0, gt)) / 1000), 0, 60);
    const players: Hud["players"] = [];
    if (lanes === 2) {
      stats.forEach((s, i) => players.push({ name: `Player ${i + 1}`, score: s.score, color: PLAYER_COLORS[i], sub: `combo x${Math.max(s.combo, 0)}` }));
    } else {
      players.push({ name: remote ? net!.name || "You" : "You", score: stats[0].score, color: PLAYER_COLORS[0], sub: `best x${Math.max(stats[0].peak, 1)}` });
      if (remote && net) {
        net.peers.filter((p) => p.id !== net.you).forEach((p, i) => players.push({
          name: p.name, score: net.scores.get(p.id)?.score ?? 0, color: PLAYER_COLORS[(i + 1) % 4], sub: p.connected ? "online" : "left",
        }));
      }
    }
    return {
      players,
      timer: gt < 0 ? "Ready" : `${left}s`,
      hint: lanes === 2 ? "Player 1 slices on the left, Player 2 on the right." : "Swipe your index finger. Mouse or touch works too.",
    };
  }

  return {
    skeleton: "tip",
    update,
    draw,
    hud,
    pointer(p) {
      if (finished) return;
      if (!p || !p.down) {
        pointerDown = false;
        blades.forEach((b) => { b.last = null; });
        return;
      }
      const gt = gameTime();
      if (gt < 0 || gt > GAME_MS) return;
      // pointer drives the first lane in single mode, or the lane under it in 2 lane mode
      const lane = lanes === 2 ? (p.x < W / 2 ? 0 : 1) : 0;
      if (!pointerDown) blades[lane].last = null;
      pointerDown = true;
      moveBlade(lane, p.x, p.y, gt, 0);
    },
    destroy() {
      offFrame();
    },
  };
}

// ---------------------------------------------------------------- juice splash overlay (photo moment)

export function splash(g: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, kinds: FruitKind[], combo: number) {
  const rand = mulberry32(combo * 131 + kinds.length * 17 + 5);
  const colors = kinds.flatMap((k) => JUICE[k]);
  g.save();
  g.beginPath();
  g.rect(rect.x, rect.y, rect.w, rect.h);
  g.clip();
  for (let i = 0; i < 34; i++) {
    const edge = rand();
    const x = rect.x + (edge < 0.5 ? rand() * rect.w * 0.35 : rect.w - rand() * rect.w * 0.35);
    const y = rect.y + rand() * rect.h;
    const r = 14 + rand() * 60;
    g.globalAlpha = 0.5 + rand() * 0.4;
    g.fillStyle = colors[Math.floor(rand() * colors.length)];
    g.beginPath();
    g.ellipse(x, y, r, r * (0.6 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(x + (rand() - 0.5) * r * 3, y + (rand() - 0.5) * r * 3, 3 + rand() * 9, 0, Math.PI * 2);
      g.fill();
    }
  }
  // a few fruit stickers in the corners
  const sticker = kinds.length ? kinds : (["mangga", "manggis"] as FruitKind[]);
  const corners: [number, number][] = [[rect.x + 90, rect.y + 90], [rect.x + rect.w - 90, rect.y + 100], [rect.x + 80, rect.y + rect.h - 230]];
  corners.forEach(([cx, cy], i) => {
    g.save();
    g.globalAlpha = 1;
    g.translate(cx, cy);
    g.rotate((i - 1) * 0.5);
    g.scale(1.6, 1.6);
    drawFruit(g, sticker[i % sticker.length], 44);
    g.restore();
  });
  g.restore();
}
