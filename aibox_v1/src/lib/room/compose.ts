"use client";

import {
  captureFrames, composeVisitorPhotostrip, STRIP_SHOT_COUNT, type CaptureFrame,
} from "../../components/landing/playground/visitor-photostrip";
import type { RoomFrameId } from "./protocol";

const FINAL_W = 1200;
const FINAL_H = 1800;
const THUMB_W = 600;
const GRID_MAX_SIDE = 1536;
const BRAND_ACCENT = "#ffab28";
const AVATAR_COLORS: readonly { bg: string; fg: string }[] = [
  { bg: "#0255fd", fg: "#ffffff" },
  { bg: "#ffab28", fg: "#211600" },
  { bg: "#11264c", fg: "#e4edff" },
  { bg: "#2f9366", fg: "#ffffff" },
];

function frameById(id: RoomFrameId): CaptureFrame {
  const f = captureFrames.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown frame "${id}"`);
  return f;
}

/**
 * Pixel size of one shot opening (first slot of shot 0). For quad slots this is the
 * edge length of the opening (what composeVisitorPhotostrip crops to), not the bounding box.
 */
export function tileSizeFor(frameId: RoomFrameId): { width: number; height: number } {
  const frame = frameById(frameId);
  const slot = frame.slots.find((s) => s.shot === 0) ?? frame.slots[0];
  const [tl, tr, , bl] = slot.corners;
  return {
    width: Math.round(Math.hypot(tr[0] - tl[0], tr[1] - tl[1])),
    height: Math.round(Math.hypot(bl[0] - tl[0], bl[1] - tl[1])),
  };
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("An image couldn't be loaded."));
    img.src = url;
  });
  try {
    await img.decode();
  } catch {
    /* already loaded; decode() can reject for some formats */
  }
  return img;
}

function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  if (typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  if (typeof VideoFrame !== "undefined" && src instanceof VideoFrame) return { w: src.displayWidth, h: src.displayHeight };
  if (typeof SVGImageElement !== "undefined" && src instanceof SVGImageElement) return { w: src.width.baseVal.value, h: src.height.baseVal.value };
  const s = src as { width: number; height: number };
  return { w: s.width, h: s.height };
}

type Rect = readonly [x: number, y: number, w: number, h: number];

/** Cover-crop `src` (centred) into the rect. */
function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, [x, y, w, h]: Rect) {
  const { w: sw, h: sh } = sourceSize(src);
  if (!sw || !sh || w <= 0 || h <= 0) return;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
}

function initialsOf(name: string | undefined, index: number): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return String(index + 1);
  return words.slice(0, 2).map((w) => Array.from(w)[0]?.toUpperCase() ?? "").join("");
}

function drawAvatar(ctx: CanvasRenderingContext2D, [x, y, w, h]: Rect, index: number, name?: string) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  ctx.fillStyle = c.bg;
  ctx.fillRect(x, y, w, h);
  const side = Math.min(w, h);
  const r = side * 0.3;
  ctx.fillStyle = c.fg;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.fg;
  ctx.font = `600 ${Math.round(side * 0.3)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initialsOf(name, index), x + w / 2, y + h / 2 + side * 0.015);
}

/** Cell rectangles for n participants in a W x H tile (plan §7.3). */
function layoutCells(n: number, W: number, H: number, gap: number): Rect[] {
  const r = W / H;
  const halfW = (W - gap) / 2;
  const halfH = (H - gap) / 2;
  const R = (x: number, y: number, w: number, h: number): Rect => [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  if (n <= 1) return [R(0, 0, W, H)];
  if (n === 2) {
    return r >= 0.8
      ? [R(0, 0, halfW, H), R(halfW + gap, 0, halfW, H)]
      : [R(0, 0, W, halfH), R(0, halfH + gap, W, halfH)];
  }
  if (n === 3) {
    if (r >= 1.3) {
      const cw = (W - gap * 2) / 3;
      return [R(0, 0, cw, H), R(cw + gap, 0, cw, H), R((cw + gap) * 2, 0, cw, H)];
    }
    if (r >= 0.8) {
      return [R(0, 0, halfW, H), R(halfW + gap, 0, halfW, halfH), R(halfW + gap, halfH + gap, halfW, halfH)];
    }
    return [R(0, 0, W, halfH), R(0, halfH + gap, halfW, halfH), R(halfW + gap, halfH + gap, halfW, halfH)];
  }
  return [
    R(0, 0, halfW, halfH), R(halfW + gap, 0, halfW, halfH),
    R(0, halfH + gap, halfW, halfH), R(halfW + gap, halfH + gap, halfW, halfH),
  ];
}

/**
 * One "group tile": every participant's still for a round laid out inside one shot opening.
 * `stills.length` is the participant count (1-4); a `null` becomes an initials avatar card.
 */
export function buildGroupTile(
  stills: (CanvasImageSource | null)[],
  width: number,
  height: number,
  opts: { gap?: number; accent?: string; names?: string[] } = {},
): HTMLCanvasElement {
  const gap = opts.gap ?? 6;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't create the group photo.");
  ctx.fillStyle = opts.accent ?? BRAND_ACCENT;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const list = stills.slice(0, 4);
  const cells = layoutCells(Math.max(1, list.length), canvas.width, canvas.height, gap);
  if (!list.length) list.push(null);
  list.forEach((src, i) => {
    const cell = cells[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell[0], cell[1], cell[2], cell[3]);
    ctx.clip();
    if (src) drawCover(ctx, src, cell);
    else drawAvatar(ctx, cell, i, opts.names?.[i]);
    ctx.restore();
  });
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image couldn't be exported."))), type, quality),
  );
}

export { canvasToBlob };

/** Composes 4 group tiles into the frame. final: JPEG q0.92 1200x1800; thumb: WebP 600px wide; preview: object URL of final. */
export async function composeRoomStrip(
  frameId: RoomFrameId,
  tiles: HTMLCanvasElement[],
): Promise<{ final: Blob; thumb: Blob; preview: string }> {
  if (tiles.length !== STRIP_SHOT_COUNT) throw new Error("Four group photos are needed to build the strip.");
  const frame = frameById(frameId);
  const artwork = await loadImage(frame.src);
  const pngUrl = await composeVisitorPhotostrip(artwork, frame, tiles);
  try {
    const composed = await loadImage(pngUrl);
    const out = document.createElement("canvas");
    out.width = FINAL_W;
    out.height = FINAL_H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Your photostrip couldn't be created.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, FINAL_W, FINAL_H);
    ctx.drawImage(composed, 0, 0, FINAL_W, FINAL_H);
    const final = await canvasToBlob(out, "image/jpeg", 0.92);

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = THUMB_W;
    thumbCanvas.height = Math.round((THUMB_W * FINAL_H) / FINAL_W);
    const tctx = thumbCanvas.getContext("2d");
    if (!tctx) throw new Error("Your photostrip couldn't be created.");
    tctx.imageSmoothingQuality = "high";
    tctx.drawImage(out, 0, 0, thumbCanvas.width, thumbCanvas.height);
    let thumb = await canvasToBlob(thumbCanvas, "image/webp", 0.85);
    if (thumb.type !== "image/webp") thumb = await canvasToBlob(thumbCanvas, "image/jpeg", 0.85); // Safari has no WebP encoder
    out.width = out.height = 0;
    return { final, thumb, preview: URL.createObjectURL(final) };
  } finally {
    URL.revokeObjectURL(pngUrl);
  }
}

/** 2x2 grid (row-major, no gaps) of up to 4 tiles for a single AI call; longest side <= 1536. */
export function stitchGrid(tiles: HTMLCanvasElement[]): HTMLCanvasElement {
  const list = tiles.slice(0, 4);
  const tw = Math.max(...list.map((t) => t.width), 1);
  const th = Math.max(...list.map((t) => t.height), 1);
  const scale = Math.min(1, GRID_MAX_SIDE / (2 * Math.max(tw, th)));
  const cw = Math.round(tw * scale);
  const ch = Math.round(th * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw * 2;
  canvas.height = ch * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the AI input.");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  list.forEach((t, i) => ctx.drawImage(t, (i % 2) * cw, Math.floor(i / 2) * ch, cw, ch));
  return canvas;
}

/** Inverse of stitchGrid: cuts the 2x2 quadrants of `img` into `count` canvases of the tile size (cover-fit if the AI changed the aspect). */
export function sliceGrid(
  img: CanvasImageSource,
  count: number,
  tile: { width: number; height: number },
): HTMLCanvasElement[] {
  const { w, h } = sourceSize(img);
  const qw = w / 2;
  const qh = h / 2;
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < Math.min(4, count); i++) {
    const c = document.createElement("canvas");
    c.width = tile.width;
    c.height = tile.height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("This browser couldn't read the AI result.");
    ctx.imageSmoothingQuality = "high";
    const sx = (i % 2) * qw;
    const sy = Math.floor(i / 2) * qh;
    const scale = Math.max(tile.width / qw, tile.height / qh);
    const cw = tile.width / scale;
    const ch = tile.height / scale;
    ctx.drawImage(img, sx + (qw - cw) / 2, sy + (qh - ch) / 2, cw, ch, 0, 0, tile.width, tile.height);
    out.push(c);
  }
  return out;
}
