"use client";

const TONES: readonly [string, string, string][] = [
  ["#3a6df0", "#12337f", "#f3c9a8"],
  ["#f3a93a", "#8a4b08", "#e2a98b"],
  ["#4bb88a", "#14604a", "#f0c7a2"],
  ["#d9648c", "#71203f", "#d9a284"],
];

const cache = new Map<number, HTMLCanvasElement>();

/** Generated "selfie" stand-in (gradient + head and shoulders) so users can preview how people fill a frame. */
export function placeholderStill(index: number): HTMLCanvasElement {
  const i = index % TONES.length;
  const hit = cache.get(i);
  if (hit) return hit;
  const [a, b, skin] = TONES[i];
  const w = 480, h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff22";
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.18, 90, 0, Math.PI * 2);
  ctx.fill();
  // shoulders
  ctx.fillStyle = "#0e1116cc";
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 20, w * 0.46, h * 0.3, 0, Math.PI, 0);
  ctx.fill();
  // neck + head
  ctx.fillStyle = skin;
  ctx.fillRect(w / 2 - 36, h * 0.52, 72, 90);
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.42, 100, 122, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1d20";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.35, 106, 98, 0, Math.PI, 0);
  ctx.fill();
  cache.set(i, c);
  return c;
}
