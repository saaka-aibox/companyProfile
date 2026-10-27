import type { HandSymbol, PlayerHand } from "./hand-input";
import { W, H } from "./engine";

export const COLORS = {
  ink: "#f3f2ed",
  muted: "rgba(243,242,237,.66)",
  blue: "#85b4ff",
  brand: "#0255fd",
  accent: "#ffab28",
  bg: "#0e1116",
  surface: "rgba(14,17,22,.72)",
  win: "#3ddc97",
  lose: "#ff5d6c",
  p1: "#85b4ff",
  p2: "#ffab28",
};
export const PLAYER_COLORS = [COLORS.p1, COLORS.p2, "#3ddc97", "#ff7ab6"];

let fonts: { sans: string; mono: string; emoji: string } | null = null;
export function F() {
  if (!fonts) {
    const body = getComputedStyle(document.body).fontFamily || "ui-sans-serif, system-ui, sans-serif";
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
    fonts = {
      sans: body,
      mono: mono ? `${mono}, ui-monospace, monospace` : "ui-monospace, SFMono-Regular, Menlo, monospace",
      emoji: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
    };
  }
  return fonts;
}

export function panel(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 12,
  fill: string = COLORS.surface, stroke?: string, lw = 2,
) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}

export function text(
  g: CanvasRenderingContext2D, s: string, x: number, y: number,
  o: { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; mono?: boolean; baseline?: CanvasTextBaseline; shadow?: boolean } = {},
) {
  g.font = `${o.weight ?? 600} ${o.size ?? 32}px ${o.mono ? F().mono : F().sans}`;
  g.textAlign = o.align ?? "left";
  g.textBaseline = o.baseline ?? "alphabetic";
  if (o.shadow !== false) {
    g.fillStyle = "rgba(0,0,0,.45)";
    g.fillText(s, x + 2, y + 2);
  }
  g.fillStyle = o.color ?? COLORS.ink;
  g.fillText(s, x, y);
}

export function emoji(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number) {
  g.font = `${size}px ${F().emoji}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  g.fillText(s, x, y);
}

export function arc(g: CanvasRenderingContext2D, x: number, y: number, r: number, progress: number, color: string, width = 8) {
  g.beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.stroke();
}

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/** Blueprint style skeleton: thin lines, square joints, a ring on the fingertip. */
export function drawSkeleton(g: CanvasRenderingContext2D, hand: PlayerHand, color: string, alpha = 0.95, tipOnly = false) {
  if (!hand.present || hand.lm.length < 21) return;
  g.save();
  g.globalAlpha = alpha;
  if (!tipOnly) {
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.beginPath();
    for (const [a, b] of BONES) {
      g.moveTo(hand.lm[a].x * W, hand.lm[a].y * H);
      g.lineTo(hand.lm[b].x * W, hand.lm[b].y * H);
    }
    g.stroke();
    g.fillStyle = color;
    for (const p of hand.lm) g.fillRect(p.x * W - 3, p.y * H - 3, 6, 6);
  }
  const tx = (tipOnly ? hand.cursor.x : hand.tip.x) * W;
  const ty = (tipOnly ? hand.cursor.y : hand.tip.y) * H;
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(tx, ty, 16, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.arc(tx, ty, 4, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function drawPoseLandmarks(g: CanvasRenderingContext2D, lm: { x: number; y: number }[], color: string, alpha: number) {
  if (lm.length < 21) return;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.lineCap = "round";
  g.beginPath();
  for (const [a, b] of BONES) {
    g.moveTo(lm[a].x * W, lm[a].y * H);
    g.lineTo(lm[b].x * W, lm[b].y * H);
  }
  g.stroke();
  g.fillStyle = color;
  for (const p of lm) {
    g.beginPath();
    g.arc(p.x * W, p.y * H, 4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export const SYMBOLS: Record<HandSymbol, { label: string; glyph: string; short: string }> = {
  none: { label: "No sign", glyph: "", short: "-" },
  fist: { label: "Fist", glyph: "✊", short: "fist" },
  palm: { label: "Open palm", glyph: "✋", short: "palm" },
  peace: { label: "Peace", glyph: "✌️", short: "peace" },
  thumb: { label: "Thumbs up", glyph: "👍", short: "thumb" },
  rock: { label: "Rock on", glyph: "🤟", short: "rock" },
  one: { label: "One finger", glyph: "☝️", short: "one" },
  three: { label: "Three fingers", glyph: "", short: "three" },
  four: { label: "Four fingers", glyph: "", short: "four" },
};

/** Draw a symbol glyph (emoji, or finger bars for 3 and 4). */
export function drawSymbol(g: CanvasRenderingContext2D, s: HandSymbol, cx: number, cy: number, size: number, color: string = COLORS.ink) {
  const n = s === "three" ? 3 : s === "four" ? 4 : 0;
  if (!n) {
    emoji(g, SYMBOLS[s].glyph, cx, cy, size);
    return;
  }
  const bw = size * 0.13, gap = size * 0.07;
  const total = n * bw + (n - 1) * gap;
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const h = size * (0.55 + (i === 1 || i === 2 ? 0.2 : 0));
    g.beginPath();
    g.roundRect(cx - total / 2 + i * (bw + gap), cy + size * 0.35 - h, bw, h, bw / 2);
    g.fill();
  }
  g.beginPath();
  g.roundRect(cx - total / 2 - gap, cy + size * 0.28, total + gap * 2, size * 0.22, bw / 2);
  g.fill();
}

export function symbolCard(
  g: CanvasRenderingContext2D, s: HandSymbol, x: number, y: number, w: number, h: number,
  o: { caption?: string; state?: "idle" | "active" | "good" | "bad"; progress?: number; badge?: string } = {},
) {
  const col = o.state === "good" ? COLORS.win : o.state === "bad" ? COLORS.lose : o.state === "active" ? COLORS.accent : "rgba(255,255,255,.28)";
  panel(g, x, y, w, h, 16, "rgba(14,17,22,.78)", col, o.state && o.state !== "idle" ? 4 : 2);
  drawSymbol(g, s, x + w / 2, y + h * 0.44, Math.min(w, h) * 0.5);
  if (o.caption) {
    text(g, o.caption, x + w / 2, y + h - 18, { size: Math.min(26, w * 0.14), align: "center", mono: true, weight: 500, color: COLORS.muted, shadow: false });
  }
  if (o.badge) {
    panel(g, x + 8, y + 8, 40, 40, 10, COLORS.accent);
    text(g, o.badge, x + 28, y + 38, { size: 26, weight: 700, color: "#211600", align: "center", shadow: false });
  }
  if (o.progress && o.progress > 0) arc(g, x + w - 30, y + 30, 16, o.progress, COLORS.accent, 5);
}

export function bannerText(g: CanvasRenderingContext2D, s: string, y = H * 0.18, size = 96, color: string = COLORS.ink) {
  text(g, s, W / 2, y, { size, weight: 700, align: "center", color });
}

/** Cover-fit an image (optionally mirrored like the live preview) into the whole stage. */
export function drawCoverFull(g: CanvasRenderingContext2D, src: HTMLCanvasElement, mirror: boolean) {
  const k = Math.max(W / src.width, H / src.height);
  const dw = src.width * k, dh = src.height * k;
  g.save();
  if (mirror) {
    g.translate(W, 0);
    g.scale(-1, 1);
  }
  g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  g.restore();
}

export function pill(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string = COLORS.ink) {
  g.font = `500 22px ${F().mono}`;
  const w = g.measureText(s).width + 36;
  panel(g, x - w / 2, y - 22, w, 44, 22, "rgba(14,17,22,.78)");
  text(g, s, x, y + 8, { size: 22, mono: true, weight: 500, align: "center", color, shadow: false });
}
