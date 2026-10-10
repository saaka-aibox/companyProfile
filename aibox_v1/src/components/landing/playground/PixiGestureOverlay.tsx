"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";

type HandPosition = { x: number; y: number; visible: boolean; pinching?: boolean };

/** Decorative tracking cues; instructions and controls remain accessible HTML. */
export function PixiGestureOverlay({ accent }: { accent: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const accentRef = useRef(accent);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    accentRef.current = accent;
    redrawRef.current?.();
  }, [accent]);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    let disposed = false;
    let release: (() => void) | undefined;
    const app = new Application();

    async function start(host: HTMLDivElement) {
      try {
        await app.init({
          resizeTo: host,
          backgroundAlpha: 0,
          antialias: false,
          resolution: Math.min(window.devicePixelRatio || 1, 1.5),
          autoDensity: true,
          autoStart: false,
          preference: "webgl",
          powerPreference: "low-power",
        });
      } catch {
        // The guide text and Three.js booth work without this effect layer.
        return;
      }
      if (disposed) {
        app.destroy(true, true);
        return;
      }

      host.appendChild(app.canvas);
      app.canvas.className = "playground-pixi-canvas";
      const graphics = new Graphics();
      app.stage.addChild(graphics);
      app.ticker.maxFPS = 30;
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let inView = true;
      let tick = 0;
      let burst = 0;
      let hand: HandPosition = { x: 0.5, y: 0.5, visible: false };

      const paint = () => {
        graphics.clear();
        const color = Number.parseInt(accentRef.current.slice(1), 16) || 0x73c9ff;
        const centerX = app.screen.width * 0.5;
        const centerY = app.screen.height * 0.47;
        const still = motionQuery.matches;
        const pulse = still ? 0 : Math.sin(tick * 0.045) * 5;

        if (hand.visible) {
          const x = (1 - hand.x) * app.screen.width;
          const y = hand.y * app.screen.height;
          graphics.circle(x, y, hand.pinching ? 16 : 25 + pulse * .3).stroke({ color, alpha: .85, width: hand.pinching ? 3 : 1.5 });
          graphics.circle(x, y, hand.pinching ? 6 : 3).fill({ color, alpha: .95 });
          if (hand.pinching) graphics.circle(x, y, 23).stroke({ color, alpha: .35, width: 1 });
          graphics.moveTo(x - 36, y).lineTo(x - 29, y).stroke({ color, alpha: 0.7, width: 1 });
          graphics.moveTo(x + 29, y).lineTo(x + 36, y).stroke({ color, alpha: 0.7, width: 1 });
        }

        if (burst > 0.01) {
          graphics.circle(centerX, centerY, 130 + (1 - burst) * 175)
            .stroke({ color, alpha: Math.min(burst * 0.5, 0.5), width: 2 });
        }
      };

      const drawOnce = () => {
        if (app.ticker.started) return;
        paint();
        app.renderer.render(app.stage);
      };
      redrawRef.current = drawOnce;
      const animate = () => {
        tick += 1;
        burst = Math.max(0, burst - 0.035);
        paint();
        if (!hand.visible && burst <= .01) app.ticker.stop();
      };
      app.ticker.add(animate);
      const syncTicker = () => {
        if (inView && !document.hidden && !motionQuery.matches && (hand.visible || burst > .01)) app.ticker.start();
        else app.ticker.stop();
        drawOnce();
      };
      const onHand = (event: Event) => {
        hand = (event as CustomEvent<HandPosition>).detail;
        syncTicker();
      };
      const onGesture = () => {
        burst = motionQuery.matches ? 0 : 1;
        syncTicker();
      };
      const stage = host.parentElement;
      stage?.addEventListener("aibox:hand", onHand);
      stage?.addEventListener("aibox:gesture", onGesture);
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        syncTicker();
      }, { threshold: 0.05 });
      observer.observe(host);
      document.addEventListener("visibilitychange", syncTicker);
      motionQuery.addEventListener("change", syncTicker);
      syncTicker();

      release = () => {
        redrawRef.current = null;
        observer.disconnect();
        stage?.removeEventListener("aibox:hand", onHand);
        stage?.removeEventListener("aibox:gesture", onGesture);
        document.removeEventListener("visibilitychange", syncTicker);
        motionQuery.removeEventListener("change", syncTicker);
        app.ticker.stop();
        app.destroy(true, true);
      };
    }

    void start(element);
    return () => {
      disposed = true;
      release?.();
    };
  }, []);

  return <div ref={hostRef} className="playground-pixi" aria-hidden="true" />;
}
