"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const PIXELS_PER_SECOND = 38;
const DRAG_THRESHOLD = 6;

type Drag = {
  pointerId: number;
  x: number;
  y: number;
  scroll: number;
  moved: boolean;
  touch: boolean;
};

/** Three identical strips allow seamless wrapping through the middle strip. */
export function useInfinitePhotoLoop(
  viewportRef: RefObject<HTMLDivElement | null>,
  stripRef: RefObject<HTMLDivElement | null>,
  paused: boolean,
  onDragStart: () => void,
) {
  const pausedRef = useRef(paused);
  const dragStartRef = useRef(onDragStart);
  const syncRef = useRef<(() => void) | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    dragStartRef.current = onDragStart;
    syncRef.current?.();
  }, [paused, onDragStart]);

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
    let lastWritten = 0;
    let inView = false;
    let drag: Drag | null = null;
    let suppressClick = false;

    function writePosition(next: number) {
      if (!width) return;
      // Wrap in either direction, including when the visitor drags over a seam.
      position = width + ((((next - width) % width) + width) % width);
      viewport.scrollLeft = position;
      lastWritten = viewport.scrollLeft;
    }

    function measure() {
      const nextWidth = strip.offsetWidth;
      if (!nextWidth || nextWidth === width) return;
      const progress = width ? (viewport.scrollLeft % width) / width : 0;
      width = nextWidth;
      finishDrag();
      writePosition(width * (1 + progress));
      sync();
    }

    function advance(time: number) {
      const delta = lastTime ? Math.min(time - lastTime, 64) : 0;
      lastTime = time;
      writePosition(position + (delta * PIXELS_PER_SECOND) / 1000);
      frame = requestAnimationFrame(advance);
    }

    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = 0;
      if (!width || !inView || document.hidden || reducedMotion.matches || pausedRef.current || drag) return;
      // Resume from a manual scroll or keyboard focus without a visible jump.
      writePosition(viewport.scrollLeft);
      frame = requestAnimationFrame(advance);
    }

    function beginDrag(event: PointerEvent) {
      if (!width || !event.isPrimary || event.button !== 0 || drag) return;
      suppressClick = false;
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scroll: viewport.scrollLeft,
        moved: false,
        touch: event.pointerType === "touch",
      };
      sync();
    }

    function moveDrag(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved) {
        // Leave vertical touch gestures to normal page scrolling.
        if (drag.touch && Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          finishDrag();
          return;
        }
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        drag.moved = true;
        suppressClick = true;
        viewport.setPointerCapture(event.pointerId);
        setDragging(true);
        dragStartRef.current();
      }
      if (event.cancelable) event.preventDefault();
      writePosition(drag.scroll - dx);
    }

    function finishDrag(event?: PointerEvent) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      const previous = drag;
      drag = null;
      if (previous.moved) setDragging(false);
      if (viewport.hasPointerCapture(previous.pointerId)) viewport.releasePointerCapture(previous.pointerId);
      sync();
    }

    function preventDragClick(event: MouseEvent) {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    function manualScroll() {
      // Ignore our own scroll events without rounding away fractional animation steps.
      if (Math.abs(viewport.scrollLeft - lastWritten) > 0.5) writePosition(viewport.scrollLeft);
    }

    function visibilityChanged() {
      if (document.hidden) finishDrag();
      sync();
    }

    const windowBlurred = () => finishDrag();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(strip);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(viewport);
    viewport.addEventListener("pointerdown", beginDrag);
    viewport.addEventListener("pointermove", moveDrag, { passive: false });
    viewport.addEventListener("lostpointercapture", finishDrag);
    viewport.addEventListener("click", preventDragClick, true);
    viewport.addEventListener("scroll", manualScroll, { passive: true });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    window.addEventListener("blur", windowBlurred);
    document.addEventListener("visibilitychange", visibilityChanged);
    reducedMotion.addEventListener("change", sync);
    syncRef.current = sync;
    measure();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      syncRef.current = null;
      resizeObserver.disconnect();
      observer.disconnect();
      viewport.removeEventListener("pointerdown", beginDrag);
      viewport.removeEventListener("pointermove", moveDrag);
      viewport.removeEventListener("lostpointercapture", finishDrag);
      viewport.removeEventListener("click", preventDragClick, true);
      viewport.removeEventListener("scroll", manualScroll);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", windowBlurred);
      document.removeEventListener("visibilitychange", visibilityChanged);
      reducedMotion.removeEventListener("change", sync);
      if (drag && viewport.hasPointerCapture(drag.pointerId)) viewport.releasePointerCapture(drag.pointerId);
    };
  }, [viewportRef, stripRef]);

  return { dragging };
}
