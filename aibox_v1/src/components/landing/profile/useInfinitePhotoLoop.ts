"use client";

import { useEffect, useRef, type RefObject } from "react";

const PIXELS_PER_SECOND = 38;

/** Three identical strips allow seamless wrapping through the middle strip. */
export function useInfinitePhotoLoop(viewportRef: RefObject<HTMLDivElement | null>, stripRef: RefObject<HTMLDivElement | null>, paused: boolean) {
  const pausedRef = useRef(paused);
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current?.();
  }, [paused]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    const stripElement = stripRef.current;
    if (!viewportElement || !stripElement) return;
    const viewport = viewportElement;
    const strip = stripElement;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let lastTime = 0;
    let width = 0;
    let position = 0;
    let inView = false;

    function measure() {
      const nextWidth = strip.offsetWidth;
      if (!nextWidth || nextWidth === width) return;
      const progress = width ? (viewport.scrollLeft % width) / width : 0;
      width = nextWidth;
      position = width * (1 + progress);
      viewport.scrollLeft = position;
    }

    function advance(time: number) {
      const delta = lastTime ? Math.min(time - lastTime, 64) : 0;
      lastTime = time;
      position += delta * PIXELS_PER_SECOND / 1000;
      if (position >= width * 2) position -= width;
      viewport.scrollLeft = position;
      frame = requestAnimationFrame(advance);
    }

    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = 0;
      if (!width || !inView || document.hidden || reducedMotion.matches || pausedRef.current) return;
      // Resume from a manual scroll or keyboard focus without a visible jump.
      position = width + (viewport.scrollLeft % width);
      viewport.scrollLeft = position;
      frame = requestAnimationFrame(advance);
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(strip);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    observer.observe(viewport);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    syncRef.current = sync;
    measure();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      syncRef.current = null;
      resizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, [viewportRef, stripRef]);
}
