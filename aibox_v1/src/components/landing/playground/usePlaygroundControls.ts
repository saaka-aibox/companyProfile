"use client";

import type { GestureRecognizerResult } from "@mediapipe/tasks-vision";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { useGestureCamera } from "../useGestureCamera";
import { createPinchRotation, type BoothPose } from "./pinch-rotation";
import type { InteractionMode, SceneController } from "./playground-types";

export function usePlaygroundControls(
  stageRef: RefObject<HTMLDivElement | null>,
  poseRef: RefObject<BoothPose>,
  controllerRef: RefObject<SceneController | null>,
  interactionMode: InteractionMode,
) {
  const pinchRef = useRef(createPinchRotation());
  const handPanRef = useRef<BoothPose | null>(null);
  const previousGestureRef = useRef<string | null>(null);
  const pointerRef = useRef<{ x: number; y: number; pose: BoothPose } | null>(null);
  const pointerActiveRef = useRef(false);
  const cameraAspectRef = useRef(4 / 3);
  const [gesture, setGesture] = useState("Camera off — explore with mouse or touch");
  const [detected, setDetected] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [hasExplored, setHasExplored] = useState(false);

  const applyPose = useCallback(
    (pose: BoothPose) => {
      if (interactionMode === "booth") {
        poseRef.current = pose;
        stageRef.current?.dispatchEvent(new Event("aibox:pose"));
      } else {
        controllerRef.current?.orbitTo(pose);
      }
      setHasExplored(true);
    },
    [interactionMode, poseRef, stageRef, controllerRef],
  );

  const handleGesture = useCallback(
    (result: GestureRecognizerResult) => {
      const base =
        interactionMode === "pan"
          ? { x: 0, y: 0 }
          : interactionMode === "booth"
            ? poseRef.current
            : (controllerRef.current?.getOrbitPose() ?? { x: 0, y: 0 });
      const grip = pinchRef.current.update(result.landmarks?.[0], base, cameraAspectRef.current);
      setDetected(Boolean(grip.point));
      setPinching(grip.pinching);
      stageRef.current?.dispatchEvent(
        new CustomEvent("aibox:hand", {
          detail: {
            x: grip.point?.x ?? 0.5,
            y: grip.point?.y ?? 0.5,
            visible: Boolean(grip.point),
            pinching: grip.pinching,
          },
        }),
      );
      if (!grip.point) {
        handPanRef.current = null;
        setGesture("Move your hand into view");
        previousGestureRef.current = null;
        return;
      }
      if (pointerActiveRef.current) {
        pinchRef.current.reset();
        handPanRef.current = null;
        setPinching(false);
        setGesture("Release the pointer to use your hand");
        return;
      }
      if (grip.pinching && grip.pose) {
        setGesture(
          interactionMode === "pan"
            ? "Pinch held — move around the venue"
            : interactionMode === "booth"
              ? "Pinch held — turn the booth"
              : "Pinch held — orbit the whole scene",
        );
        if (interactionMode === "pan") {
          const previous = handPanRef.current ?? { x: 0, y: 0 };
          controllerRef.current?.panBy((grip.pose.x - previous.x) * 4, (grip.pose.y - previous.y) * 4);
          handPanRef.current = grip.pose;
          setHasExplored(true);
        } else {
          applyPose(grip.pose);
        }
        previousGestureRef.current = null;
        return;
      }
      handPanRef.current = null;
      const category = result.gestures?.[0]?.[0]?.categoryName;
      const named = category && category !== "None" ? category.replaceAll("_", " ") : null;
      setGesture(named ?? "Hand detected — pinch thumb and index finger");
      if (named !== previousGestureRef.current) {
        previousGestureRef.current = named;
        if (named === "Victory") controllerRef.current?.captureGuest();
        if (named === "Thumb Up") controllerRef.current?.sendGuest();
        if (named) stageRef.current?.dispatchEvent(new Event("aibox:gesture"));
      }
    },
    [interactionMode, poseRef, controllerRef, stageRef, applyPose],
  );

  const camera = useGestureCamera(handleGesture);

  useEffect(() => {
    pinchRef.current.reset();
    handPanRef.current = null;
    if (camera.mode !== "ready") {
      stageRef.current?.dispatchEvent(
        new CustomEvent("aibox:hand", { detail: { x: 0.5, y: 0.5, visible: false, pinching: false } }),
      );
    }
  }, [camera.mode, interactionMode, stageRef]);

  function clearHand() {
    pinchRef.current.reset();
    handPanRef.current = null;
    previousGestureRef.current = null;
    setPinching(false);
    setDetected(false);
    setGesture("Move your hand into view");
    stageRef.current?.dispatchEvent(
      new CustomEvent("aibox:hand", { detail: { x: 0.5, y: 0.5, visible: false, pinching: false } }),
    );
  }

  function resetView() {
    clearHand();
    controllerRef.current?.resetView();
    setGesture(camera.mode === "ready" ? "View centered — pinch to explore" : "Drag to explore the scene");
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    pointerActiveRef.current = true;
    pinchRef.current.reset();
    if (interactionMode !== "booth") {
      setHasExplored(true);
      return;
    }
    pointerRef.current = { x: event.clientX, y: event.clientY, pose: { ...poseRef.current } };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    if (!start || interactionMode !== "booth") return;
    // Keep simple clicks on the canvas so the renderer can select a guest.
    if (
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4 &&
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    applyPose({
      x: start.pose.x + (event.clientX - start.x) * 0.35,
      y: Math.max(-25, Math.min(25, start.pose.y - (event.clientY - start.y) * 0.16)),
    });
  }

  function onPointerEnd() {
    pointerRef.current = null;
    pointerActiveRef.current = false;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const directions: Record<string, BoothPose> = {
      ArrowLeft: { x: -8, y: 0 },
      ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -5 },
      ArrowDown: { x: 0, y: 5 },
    };
    if (event.key === "Home") {
      event.preventDefault();
      resetView();
      return;
    }
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      controllerRef.current?.zoomBy(event.key === "-" ? -0.15 : 0.15);
      return;
    }
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    pinchRef.current.reset();
    if (interactionMode === "pan" || (event.shiftKey && interactionMode !== "booth")) {
      controllerRef.current?.panBy(delta.x * 8, delta.y * 8);
      return;
    }
    const pose =
      interactionMode === "booth"
        ? poseRef.current
        : (controllerRef.current?.getOrbitPose() ?? { x: 0, y: 0 });
    applyPose({ x: pose.x + delta.x, y: Math.max(-25, Math.min(25, pose.y + delta.y)) });
  }

  return {
    ...camera,
    gesture,
    detected,
    pinching,
    hasExplored,
    cameraAspectRef,
    resetView,
    enableCamera() {
      clearHand();
      void camera.startCamera();
    },
    disableCamera() {
      camera.stopCamera();
      clearHand();
    },
    stageEvents: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onLostPointerCapture: onPointerEnd,
      onKeyDown,
    },
  };
}
