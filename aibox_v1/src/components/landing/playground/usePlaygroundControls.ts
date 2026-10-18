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
import {
  VISITOR_GUEST,
  EMPTY_VISITOR_HAND,
  type InteractionMode,
  type SceneController,
  type PhotoTask,
  type VisitorHand,
} from "./playground-types";
import { createPeaceTrigger } from "./peace-trigger";

type VisitorControls = {
  videoRef: RefObject<HTMLVideoElement | null>;
  handRef: RefObject<VisitorHand>;
  selectedGuest: number;
  task: PhotoTask;
  visitorReady: boolean;
};

export function usePlaygroundControls(
  stageRef: RefObject<HTMLDivElement | null>,
  poseRef: RefObject<BoothPose>,
  controllerRef: RefObject<SceneController | null>,
  interactionMode: InteractionMode,
  { videoRef, handRef, selectedGuest, task, visitorReady }: VisitorControls,
) {
  const pinchRef = useRef(createPinchRotation());
  const handPanRef = useRef<BoothPose | null>(null);
  const previousGestureRef = useRef<string | null>(null);
  const peaceTriggerRef = useRef(createPeaceTrigger());
  const pointerRef = useRef<{ x: number; y: number; pose: BoothPose } | null>(null);
  const pointerActiveRef = useRef(false);
  const cameraAspectRef = useRef(4 / 3);
  const [gesture, setGesture] = useState("Camera off — explore with mouse or touch");
  const [detected, setDetected] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [hasExplored, setHasExplored] = useState(false);
  const [peaceProgress, setPeaceProgress] = useState(0);

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
        interactionMode === "pan" || interactionMode === "guest"
          ? { x: 0, y: 0 }
          : interactionMode === "booth"
            ? poseRef.current
            : (controllerRef.current?.getOrbitPose() ?? { x: 0, y: 0 });
      const grip = pinchRef.current.update(result.landmarks?.[0], base, cameraAspectRef.current);
      const category = result.gestures?.[0]?.[0];
      const now = performance.now();
      const peace = Boolean(
        grip.point && !grip.pinching && category?.categoryName === "Victory" && category.score >= 0.75,
      );
      handRef.current = { detected: Boolean(grip.point), peace, y: grip.point?.y ?? 0.5, updatedAt: now };
      const visitor = selectedGuest === VISITOR_GUEST;
      const peaceCapture = peaceTriggerRef.current.update(
        peace,
        visitor && visitorReady && ["posing", "error"].includes(task.phase) && !pointerActiveRef.current,
        now,
      );
      setPeaceProgress(Math.floor(peaceCapture.progress * 4) / 4);
      if (peaceCapture.triggered) controllerRef.current?.captureGuest();
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
          interactionMode === "guest"
            ? "Pinch held — moving You / Guest 06"
            : interactionMode === "pan"
              ? "Pinch held — move around the venue"
              : interactionMode === "booth"
                ? "Pinch held — turn the booth"
                : "Pinch held — orbit the whole scene",
        );
        if (interactionMode === "pan" || interactionMode === "guest") {
          const previous = handPanRef.current ?? { x: 0, y: 0 };
          if (interactionMode === "guest") {
            controllerRef.current?.moveVisitorBy(
              (grip.pose.x - previous.x) * 0.025,
              -(grip.pose.y - previous.y) * 0.035,
            );
          } else {
            controllerRef.current?.panBy((grip.pose.x - previous.x) * 4, (grip.pose.y - previous.y) * 4);
          }
          handPanRef.current = grip.pose;
          setHasExplored(true);
        } else {
          applyPose(grip.pose);
        }
        previousGestureRef.current = null;
        return;
      }
      handPanRef.current = null;
      const named =
        category && category.categoryName !== "None" && category.score >= 0.75
          ? category.categoryName.replaceAll("_", " ")
          : null;
      setGesture(
        peace && visitor
          ? "Peace sign detected — hold until the shutter"
          : (named ?? "Hand detected — pinch thumb and index finger"),
      );
      if (named !== previousGestureRef.current) {
        previousGestureRef.current = named;
        if (named === "Victory" && !visitor) controllerRef.current?.captureGuest();
        if (named === "Thumb Up") controllerRef.current?.sendGuest();
        if (named) stageRef.current?.dispatchEvent(new Event("aibox:gesture"));
      }
    },
    [
      interactionMode,
      poseRef,
      controllerRef,
      stageRef,
      applyPose,
      handRef,
      selectedGuest,
      task.phase,
      visitorReady,
    ],
  );

  const camera = useGestureCamera(handleGesture, videoRef);

  useEffect(() => {
    const releasePointer = () => {
      pointerRef.current = null;
      pointerActiveRef.current = false;
    };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
    };
  }, []);

  useEffect(() => {
    pinchRef.current.reset();
    handPanRef.current = null;
    peaceTriggerRef.current.reset();
    handRef.current = { ...EMPTY_VISITOR_HAND };
    if (camera.mode !== "ready") {
      stageRef.current?.dispatchEvent(
        new CustomEvent("aibox:hand", { detail: { x: 0.5, y: 0.5, visible: false, pinching: false } }),
      );
    }
  }, [camera.mode, interactionMode, selectedGuest, stageRef, handRef]);

  function clearHand() {
    pinchRef.current.reset();
    handPanRef.current = null;
    previousGestureRef.current = null;
    peaceTriggerRef.current.reset();
    handRef.current = { ...EMPTY_VISITOR_HAND };
    setPeaceProgress(0);
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
    if (interactionMode !== "booth" && interactionMode !== "guest") {
      setHasExplored(true);
      return;
    }
    pointerRef.current = { x: event.clientX, y: event.clientY, pose: { ...poseRef.current } };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    if (!start || (interactionMode !== "booth" && interactionMode !== "guest")) return;
    // Keep simple clicks on the canvas so the renderer can select a guest.
    if (
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4 &&
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (interactionMode === "guest") {
      controllerRef.current?.moveVisitorBy(
        (event.clientX - start.x) * 0.015,
        (event.clientY - start.y) * 0.015,
      );
      pointerRef.current = { ...start, x: event.clientX, y: event.clientY };
      setHasExplored(true);
      return;
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
    if (interactionMode === "guest") {
      controllerRef.current?.moveVisitorBy(delta.x * 0.05, delta.y * 0.07);
      setHasExplored(true);
      return;
    }
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
    peaceProgress,
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
