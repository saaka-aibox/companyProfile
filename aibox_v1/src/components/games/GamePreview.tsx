"use client";

import { useEffect, useRef } from "react";
import type { GameId } from "../../lib/games/catalog";
import { F, drawPoseLandmarks, drawSymbol } from "../../lib/games/draw";
import { drawFruit, type FruitKind } from "../../lib/games/engines/irisan-buah";
import { templateAt } from "../../lib/games/engines/tepuk-sinkron";
import type { HandSymbol } from "../../lib/games/hand-input";
import { pickColor, prefersReducedMotion } from "../../lib/games/util";

const PW = 600;
const PH = 360;

type Theme = { bg: string; surface: string; ink: string; blue: string; line: string; accent: string; muted: string };

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
}

function suit(g: CanvasRenderingContext2D, t: number, th: Theme) {
  const syms = ["✊", "✌️", "✋"];
  const names = ["BATU", "GUNTING", "KERTAS"];
  const k = Math.floor(t / 0.8) % 3;
  syms.forEach((s, i) => {
    const x = 70 + i * 170, y = 70 + (i === k ? -10 : 0);
    rr(g, x, y, 150, 190, 16, th.surface, i === k ? th.accent : th.line);
    g.font = `70px ${F().emoji}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = th.ink;
    g.fillText(s, x + 75, y + 90);
    g.font = `600 18px ${F().mono}`;
    g.fillStyle = i === k ? th.accent : th.muted;
    g.fillText(names[i], x + 75, y + 160);
  });
  g.font = `700 44px ${F().sans}`;
  g.fillStyle = th.blue;
  g.fillText(k === 2 ? "SUIT!" : "...", PW / 2, 310);
}

function irisan(g: CanvasRenderingContext2D, t: number, th: Theme) {
  const kinds: FruitKind[] = ["mangga", "rambutan", "nanas", "manggis", "salak", "bomb"];
  kinds.forEach((k, i) => {
    const u = ((t * 0.45 + i / kinds.length) % 1);
    const x = 70 + (i / (kinds.length - 1)) * (PW - 140) + Math.sin(i * 2) * 20;
    const y = PH + 40 - 4 * u * (1 - u) * 330;
    g.save();
    g.translate(x, y);
    g.rotate(t * (i % 2 ? 1.5 : -1.2) + i);
    g.scale(0.62, 0.62);
    drawFruit(g, k, 46, t);
    g.restore();
  });
  const s = (t * 0.9) % 2;
  if (s < 1) {
    g.strokeStyle = th.blue;
    g.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const a = Math.max(0, s - i * 0.03);
      g.globalAlpha = 1 - i / 8;
      g.lineWidth = 10 - i;
      g.beginPath();
      g.moveTo(40 + a * 520, 90 + a * 150);
      g.lineTo(40 + (a + 0.03) * 520, 90 + (a + 0.03) * 150);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

function kode(g: CanvasRenderingContext2D, t: number, th: Theme) {
  const seq: HandSymbol[] = ["fist", "peace", "palm", "thumb"];
  const k = Math.floor(t / 0.7) % 6;
  g.font = `600 16px ${F().mono}`;
  g.textAlign = "center";
  g.fillStyle = th.accent;
  g.fillText("COMMANDER SAYS...", PW / 2, 56);
  seq.forEach((s, i) => {
    const x = 60 + i * 130, lit = i === k;
    rr(g, x, 90, 110, 140, 14, th.surface, lit ? th.accent : th.line);
    if (i <= k || k >= 4) drawSymbol(g, s, x + 55, 150, 62, th.ink);
    else { g.font = `700 40px ${F().sans}`; g.fillStyle = th.muted; g.fillText("?", x + 55, 160); }
  });
  rr(g, 60, 270, 480, 14, 7, th.line);
  rr(g, 60, 270, 480 * (((t * 0.5) % 1)), 14, 7, th.blue);
}

function tepuk(g: CanvasRenderingContext2D, t: number, th: Theme) {
  const u = 0.5 + 0.5 * Math.sin(t * 1.6);
  const left = templateAt(0.14 + u * 0.22, 0.52, 1.1);
  const right = left.map((p) => ({ x: 1 - p.x, y: p.y }));
  g.save();
  g.scale(PW / 960, PH / 720);
  drawPoseLandmarks(g, left.map((p) => ({ x: p.x, y: p.y })), th.blue, 0.95);
  drawPoseLandmarks(g, right, th.accent, 0.95);
  g.restore();
  g.strokeStyle = th.accent;
  g.lineWidth = 3;
  g.setLineDash([8, 8]);
  g.beginPath();
  g.ellipse(PW / 2, PH / 2, 40 + u * 14, 54 + u * 14, 0, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  if (u > 0.92) {
    g.font = `700 34px ${F().sans}`;
    g.textAlign = "center";
    g.fillStyle = th.accent;
    g.fillText("TEPUK!", PW / 2, 70);
  }
}

const SCENES: Record<GameId, (g: CanvasRenderingContext2D, t: number, th: Theme) => void> = {
  "suit-arena": suit,
  "irisan-buah": irisan,
  "kode-komando": kode,
  "tepuk-sinkron": tepuk,
};

export function GamePreview({ id }: { id: GameId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    canvas.width = PW;
    canvas.height = PH;
    const reduced = prefersReducedMotion();
    let visible = true;
    let raf = 0;
    let last = 0;
    let theme: Theme | null = null;
    let themeAt = 0;
    const readTheme = (): Theme => ({
      bg: pickColor("--aibox-soft", "#1d242e"), surface: pickColor("--aibox-surface", "#151a21"), ink: pickColor("--aibox-ink", "#f3f2ed"),
      blue: pickColor("--aibox-blue", "#85b4ff"), line: pickColor("--aibox-line", "#2b343e"), accent: pickColor("--aibox-accent", "#ffab28"),
      muted: pickColor("--aibox-muted", "#a6afb9"),
    });
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || ts - last < 33) return;
      last = ts;
      if (!theme || ts - themeAt > 600) { theme = readTheme(); themeAt = ts; }
      g.clearRect(0, 0, PW, PH);
      g.fillStyle = theme.bg;
      g.fillRect(0, 0, PW, PH);
      SCENES[id](g, reduced ? 1.4 : ts / 1000, theme);
      if (reduced) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [id]);

  return <canvas ref={ref} role="img" aria-label={`Animated preview of ${id.replace("-", " ")}`} />;
}
