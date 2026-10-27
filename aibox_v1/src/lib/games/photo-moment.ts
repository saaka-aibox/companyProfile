import { captureFrames, composeVisitorPhotostrip, STRIP_SHOT_COUNT } from "../../components/landing/playground/visitor-photostrip";

/**
 * Photo Moment Engine. A small ring buffer of recent camera frames plus a full-resolution
 * capture on demand. Captures are NOT mirrored (the file is a true photo); the live preview
 * is mirrored with CSS, and `mirrorCanvas` is used when a frozen frame is shown in the preview.
 */
export class MomentBuffer {
  private ring: HTMLCanvasElement[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    private video: HTMLVideoElement,
    private opts: { frames?: number; width?: number; intervalMs?: number } = {},
  ) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.push(), this.opts.intervalMs ?? 250);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ring.forEach((c) => (c.width = c.height = 0));
    this.ring = [];
  }

  private ready() {
    const v = this.video;
    return !document.hidden && v.readyState >= 2 && v.videoWidth > 0 && !v.paused;
  }

  private snap(maxWidth: number): HTMLCanvasElement | null {
    if (!this.ready()) return null;
    const v = this.video;
    const scale = Math.min(1, maxWidth / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(v.videoWidth * scale));
    c.height = Math.max(1, Math.round(v.videoHeight * scale));
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(v, 0, 0, c.width, c.height);
    return c;
  }

  private push() {
    const c = this.snap(this.opts.width ?? 480);
    if (!c) return;
    this.ring.push(c);
    const max = this.opts.frames ?? 10;
    while (this.ring.length > max) {
      const old = this.ring.shift();
      if (old) old.width = old.height = 0;
    }
  }

  /** Recent small frames, oldest first. */
  recent(n = this.ring.length): HTMLCanvasElement[] {
    return this.ring.slice(-n);
  }

  /** Full resolution (up to 1280 px wide) capture, not mirrored. Null when the camera is not ready. */
  captureFull(maxWidth = 1280): HTMLCanvasElement | null {
    return this.snap(maxWidth);
  }

  /** Small thumbnail capture (default 480 px), not mirrored. */
  captureThumb(maxWidth = 480): HTMLCanvasElement | null {
    return this.snap(maxWidth);
  }
}

export function mirrorCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d");
  if (g) {
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
  }
  return c;
}

export function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")?.drawImage(src, 0, 0);
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be saved. Please try again."))), type, quality),
  );
}

/** Downscale to `maxWidth` and encode as a JPEG data URL no larger than `maxChars` (base64 payload). */
export function encodeThumb(src: HTMLCanvasElement, maxWidth = 480, maxChars = 60_000): string {
  let width = Math.min(maxWidth, src.width);
  let quality = 0.72;
  for (let i = 0; i < 8; i++) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = Math.round((src.height * width) / src.width);
    c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", quality);
    const payload = url.length - url.indexOf(",") - 1;
    if (payload <= maxChars) return url;
    if (quality > 0.45) quality -= 0.1;
    else width = Math.round(width * 0.8);
  }
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = Math.round((src.height * 240) / src.width);
  c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.5);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image could not be loaded."));
    img.src = src;
  });
}

// ---------------------------------------------------------------- AI Box game card

export type StampTone = "win" | "lose" | "draw" | "gold";
export type MomentCardOptions = {
  game: string;
  headline: string;
  subline?: string;
  stamp?: { text: string; tone: StampTone };
  stats?: { label: string; value: string }[];
  /** Single photo, not mirrored. */
  photo?: CanvasImageSource | null;
  /** Split mode: left (own, drawn mirrored like the preview) and right (partner, as captured). */
  split?: { left: CanvasImageSource; right: CanvasImageSource } | null;
  /** Draws extra art over the photo window (juice splash, confetti...). */
  drawOverlay?: (g: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void;
};

const CARD_W = 1080;
const CARD_H = 1350;
const TONES: Record<StampTone, string> = { win: "#3ddc97", lose: "#ff5d6c", draw: "#85b4ff", gold: "#ffab28" };

function srcSize(s: CanvasImageSource) {
  const a = s as HTMLCanvasElement & HTMLImageElement & HTMLVideoElement;
  return { w: a.videoWidth || a.naturalWidth || a.width || 1, h: a.videoHeight || a.naturalHeight || a.height || 1 };
}

function drawCover(g: CanvasRenderingContext2D, s: CanvasImageSource, x: number, y: number, w: number, h: number, mirror = false) {
  const { w: sw, h: sh } = srcSize(s);
  const k = Math.max(w / sw, h / sh);
  const cw = w / k, ch = h / k;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  if (mirror) {
    g.translate(x + w, y);
    g.scale(-1, 1);
    g.drawImage(s, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
  } else {
    g.drawImage(s, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
  }
  g.restore();
}

function fontStacks() {
  const body = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  const mono = typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() : "";
  return {
    sans: body || "ui-sans-serif, system-ui, sans-serif",
    mono: mono ? `${mono}, ui-monospace, monospace` : "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
}

function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number, family: string) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (g.measureText(text).width > maxW && s > 24);
}

/** A game branded 4:5 card in the site's look (dark surface, brand blue, amber accent, mono labels). */
export function composeMomentCard(o: MomentCardOptions): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CARD_W;
  c.height = CARD_H;
  const g = c.getContext("2d")!;
  const f = fontStacks();
  // surface
  const bg = g.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#11264c");
  bg.addColorStop(0.55, "#0e1116");
  bg.addColorStop(1, "#151a21");
  g.fillStyle = bg;
  g.fillRect(0, 0, CARD_W, CARD_H);
  g.strokeStyle = "rgba(133,180,255,.12)";
  g.lineWidth = 1;
  for (let x = 0; x <= CARD_W; x += 54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CARD_H); g.stroke(); }
  for (let y = 0; y <= CARD_H; y += 54) { g.beginPath(); g.moveTo(0, y); g.lineTo(CARD_W, y); g.stroke(); }

  // header
  g.fillStyle = "#ffab28";
  g.fillRect(60, 66, 12, 12);
  g.fillStyle = "#85b4ff";
  g.font = `500 26px ${f.mono}`;
  g.textBaseline = "alphabetic";
  g.fillText(`ai box games / ${o.game.toLowerCase()}`, 88, 80);
  g.textAlign = "right";
  g.fillStyle = "rgba(243,242,237,.6)";
  g.fillText(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase(), CARD_W - 60, 80);
  g.textAlign = "left";

  // photo window
  const win = { x: 60, y: 118, w: CARD_W - 120, h: 800 };
  g.save();
  g.beginPath();
  g.roundRect(win.x, win.y, win.w, win.h, 18);
  g.clip();
  const fill = g.createLinearGradient(0, win.y, 0, win.y + win.h);
  fill.addColorStop(0, "#1d242e");
  fill.addColorStop(1, "#0255fd");
  g.fillStyle = fill;
  g.fillRect(win.x, win.y, win.w, win.h);
  if (o.split) {
    const half = win.w / 2;
    drawCover(g, o.split.left, win.x, win.y, half, win.h, true);
    drawCover(g, o.split.right, win.x + half, win.y, half, win.h, false);
    g.strokeStyle = "rgba(255,255,255,.9)";
    g.setLineDash([14, 12]);
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(win.x + half, win.y); g.lineTo(win.x + half, win.y + win.h); g.stroke();
    g.setLineDash([]);
  } else if (o.photo) {
    drawCover(g, o.photo, win.x, win.y, win.w, win.h, false);
  } else {
    g.fillStyle = "rgba(255,255,255,.18)";
    g.font = `600 220px ${f.sans}`;
    g.textAlign = "center";
    g.fillText("AI", win.x + win.w / 2 - 110, win.y + win.h / 2 + 70);
    g.fillText("BOX", win.x + win.w / 2 + 120, win.y + win.h / 2 + 70);
    g.textAlign = "left";
  }
  // vignette for legibility
  const vig = g.createLinearGradient(0, win.y + win.h * 0.55, 0, win.y + win.h);
  vig.addColorStop(0, "rgba(14,17,22,0)");
  vig.addColorStop(1, "rgba(14,17,22,.55)");
  g.fillStyle = vig;
  g.fillRect(win.x, win.y, win.w, win.h);
  o.drawOverlay?.(g, win);
  g.restore();
  g.strokeStyle = "rgba(255,255,255,.22)";
  g.lineWidth = 2;
  g.beginPath(); g.roundRect(win.x, win.y, win.w, win.h, 18); g.stroke();

  // stamp
  if (o.stamp) {
    const col = TONES[o.stamp.tone];
    g.save();
    g.translate(win.x + win.w / 2, win.y + win.h * 0.78);
    g.rotate(-0.1);
    g.font = `700 150px ${f.sans}`;
    const w = g.measureText(o.stamp.text).width + 90;
    g.fillStyle = "rgba(14,17,22,.62)";
    g.beginPath(); g.roundRect(-w / 2, -120, w, 170, 14); g.fill();
    g.strokeStyle = col;
    g.lineWidth = 10;
    g.beginPath(); g.roundRect(-w / 2, -120, w, 170, 14); g.stroke();
    g.fillStyle = col;
    g.textAlign = "center";
    g.fillText(o.stamp.text, 0, 22);
    g.restore();
  }

  // copy
  g.textAlign = "left";
  g.fillStyle = "#f3f2ed";
  fitText(g, o.headline, CARD_W - 120, 84, 560, f.sans);
  g.fillText(o.headline, 60, 1018);
  if (o.subline) {
    g.fillStyle = "rgba(243,242,237,.72)";
    fitText(g, o.subline, CARD_W - 120, 36, 400, f.sans);
    g.fillText(o.subline, 60, 1074);
  }
  if (o.stats?.length) {
    const n = Math.min(4, o.stats.length);
    const cw = (CARD_W - 120) / n;
    o.stats.slice(0, n).forEach((s, i) => {
      const x = 60 + i * cw;
      g.fillStyle = "rgba(255,255,255,.07)";
      g.beginPath(); g.roundRect(x + (i ? 8 : 0), 1118, cw - 8, 112, 10); g.fill();
      g.fillStyle = "#85b4ff";
      g.font = `500 22px ${f.mono}`;
      g.fillText(s.label.toLowerCase(), x + 22 + (i ? 8 : 0), 1156);
      g.fillStyle = "#f3f2ed";
      fitText(g, s.value, cw - 52, 50, 560, f.sans);
      g.fillText(s.value, x + 22 + (i ? 8 : 0), 1210);
    });
  }
  // footer wordmark
  g.fillStyle = "#ffab28";
  g.font = `700 34px ${f.sans}`;
  g.fillText("AIBOX", 60, 1300);
  g.fillStyle = "rgba(243,242,237,.6)";
  g.font = `500 22px ${f.mono}`;
  g.textAlign = "right";
  g.fillText("a little technology. a lot of personality.", CARD_W - 60, 1298);
  g.textAlign = "left";
  return c;
}

/** Four-shot burst in an AI Box photostrip frame (reuses the Playground composer). Returns a PNG object URL. */
export async function composeStripMoment(frames: HTMLCanvasElement[], frameId = "songs"): Promise<string> {
  if (frames.length < 1) throw new Error("No camera frames were captured for the photostrip.");
  const frame = captureFrames.find((f) => f.id === frameId) ?? captureFrames[0];
  const shots: HTMLCanvasElement[] = [];
  for (let i = 0; i < STRIP_SHOT_COUNT; i++) {
    const idx = Math.round((i * (frames.length - 1)) / Math.max(1, STRIP_SHOT_COUNT - 1));
    shots.push(frames[idx]);
  }
  const art = await loadImage(frame.src);
  return composeVisitorPhotostrip(art, frame, shots);
}

export const STRIP_MIN_FRAMES = 4;

// ---------------------------------------------------------------- download + share

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function shareBlob(blob: Blob, filename: string, text: string): Promise<"shared" | "unsupported" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return "unsupported";
  try {
    await nav.share({ files: [file], title: "AI Box Games", text });
    return "shared";
  } catch (e) {
    return (e as Error).name === "AbortError" ? "cancelled" : "unsupported";
  }
}
