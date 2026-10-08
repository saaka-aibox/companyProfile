"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { getVenue, type VenueId } from "./venue-presets";

type HandPosition = { x: number; y: number; visible: boolean; pinching?: boolean };

/** Decorative tracking cues; instructions and controls remain accessible HTML. */
export function PixiGestureOverlay({ accent, venue, ambientMotion }: { accent: string; venue: VenueId; ambientMotion: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const accentRef = useRef(accent);
  const redrawRef = useRef<(() => void) | null>(null);
  const venueRef = useRef(venue);
  const motionRef = useRef(ambientMotion);
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    accentRef.current = accent;
    redrawRef.current?.();
  }, [accent]);

  useEffect(() => {
    venueRef.current = venue; motionRef.current = ambientMotion;
    syncRef.current?.(); redrawRef.current?.();
  }, [venue, ambientMotion]);

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
        const still = motionQuery.matches || !motionRef.current;
        const pulse = still ? 0 : Math.sin(tick * 0.045) * 5;
        const atmosphere = getVenue(venueRef.current).atmosphere;

        // A restrained aiming field around the booth, visible before camera access.
        if (atmosphere === "none") {
          graphics.circle(centerX, centerY, 120 + pulse).stroke({ color, alpha: 0.12, width: 1 });
          graphics.circle(centerX, centerY, 174 - pulse).stroke({ color, alpha: 0.06, width: 1 });
        } else {
          const drift = still ? 0 : tick * .0015;
          for (let index = 0; index < 16; index++) {
            // Ambient details stay near the room edges so the booth remains clear.
            const side = index % 2 === 0 ? .12 : .87;
            const x = app.screen.width * (side + Math.sin(index * 2.1 + drift) * .065);
            const y = ((index / 16 + drift * .16) % 1) * app.screen.height;
            const warm = atmosphere === "petals" || atmosphere === "dust" ? 0xffe6bb : color;
            if (atmosphere === "petals") graphics.ellipse(x, y, 3, 1.5).fill({ color: warm, alpha: .35 });
            else graphics.circle(x, y, atmosphere === "dust" ? 1.4 : 2.4).fill({ color: warm, alpha: .22 });
          }
        }

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
      };
      app.ticker.add(animate);
      const syncTicker = () => {
        if (inView && !document.hidden && !motionQuery.matches && motionRef.current) app.ticker.start();
        else app.ticker.stop();
        drawOnce();
      };
      syncRef.current = syncTicker;
      const onHand = (event: Event) => {
        hand = (event as CustomEvent<HandPosition>).detail;
        drawOnce();
      };
      const onGesture = () => {
        burst = 1;
        drawOnce();
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
        syncRef.current = null;
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
