"use client";

import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";

export type CameraMode = "idle" | "requesting" | "loading" | "ready" | "preview" | "error";
type CameraSession = {
  stream: MediaStream | null;
  recognizer: GestureRecognizer | null;
  frame: number | null;
  loading: boolean;
};

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

function cameraErrorMessage(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera access was not allowed. Open this site's permissions beside the address bar, allow Camera, then try again. Also check your device's camera privacy settings. If this page is embedded, open it in its own tab.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Connect or enable a camera, then try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your camera could not start. Close other apps using it and check your device's camera privacy settings, then try again.";
    case "OverconstrainedError":
      return "This camera could not provide a compatible preview. Try another camera or browser.";
    case "SecurityError":
      return "This browser has disabled camera access for this page. Check site permissions or open the page in its own browser tab.";
    case "AbortError":
      return "Camera startup was interrupted. Please try again.";
    default:
      return "The camera preview could not start. Check your camera connection and browser permissions, then try again.";
  }
}

async function createRecognizer(): Promise<GestureRecognizer> {
  const { FilesetResolver, GestureRecognizer: Recognizer } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options = { runningMode: "VIDEO" as const, numHands: 1 };
  try {
    return await Recognizer.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
    });
  } catch {
    return Recognizer.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
    });
  }
}

/** Camera permission is requested before downloading the optional hand tracker. */
export function useGestureCamera(onResult: (result: GestureRecognizerResult) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const resultRef = useRef(onResult);
  const [mode, setMode] = useState<CameraMode>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { resultRef.current = onResult; }, [onResult]);

  const releaseSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    if (session.frame !== null) cancelAnimationFrame(session.frame);
    session.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    session.recognizer?.close();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    releaseSession();
    setError(null);
    setMode("idle");
  }, [releaseSession]);

  useEffect(() => () => releaseSession(), [releaseSession]);

  const startCamera = useCallback(async () => {
    const existing = sessionRef.current;
    if (existing?.loading || existing?.recognizer) return;
    setError(null);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(!window.isSecureContext
        ? "Camera access needs HTTPS or localhost. On this computer, use localhost instead of a network IP. For a phone or another device, use an HTTPS address."
        : "Camera access is unavailable in this browser. Open this page in a current version of Chrome, Edge, Firefox, or Safari.");
      setMode("error");
      return;
    }

    if (sessionRef.current) sessionRef.current.loading = true;
    const session: CameraSession = sessionRef.current ?? { stream: null, recognizer: null, frame: null, loading: true };
    sessionRef.current = session;
    const isCurrent = () => sessionRef.current === session;

    // No import, model download, or permission preflight before this request.
    // The browser owns the prompt and can reuse an existing allow/block choice.
    if (!session.stream) {
      setMode("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: "user" } },
          audio: false,
        });
        if (!isCurrent() || !sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        sessionRef.current.stream = stream;
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            if (!isCurrent()) return;
            releaseSession();
            setMode("error");
            setError("The camera was disconnected or access was revoked. Reconnect it or allow Camera in site settings, then try again.");
          };
        });
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is unavailable.");
        video.srcObject = stream;
        setMode("loading");
        await video.play();
        if (!isCurrent()) return;
      } catch (cause) {
        if (!isCurrent()) return;
        releaseSession();
        setMode("error");
        setError(cameraErrorMessage(cause));
        return;
      }
    }

    setMode("loading");
    try {
      const recognizer = await createRecognizer();
      if (!isCurrent() || !sessionRef.current) {
        recognizer.close();
        return;
      }
      sessionRef.current.recognizer = recognizer;
      sessionRef.current.loading = false;
      setMode("ready");
      let lastVideoTime = -1;
      const tick = () => {
        const video = videoRef.current;
        if (!isCurrent() || !sessionRef.current || !video) return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            resultRef.current(recognizer.recognizeForVideo(video, performance.now()));
          } catch {
            // Keep the camera usable when tracking fails; allow an explicit retry.
            sessionRef.current.recognizer = null;
            recognizer.close();
            setMode("preview");
            setError("Hand tracking stopped. Your camera preview is still available. Retry hand control or use drag and arrow keys.");
            return;
          }
        }
        sessionRef.current.frame = requestAnimationFrame(tick);
      };
      sessionRef.current.frame = requestAnimationFrame(tick);
    } catch {
      if (!isCurrent() || !sessionRef.current) return;
      sessionRef.current.loading = false;
      setMode("preview");
      setError("Your camera is ready, but hand control could not load. Check your internet connection and retry. You can still use drag and arrow keys.");
    }
  }, [releaseSession]);

  return {
    videoRef, mode, error, startCamera, stopCamera,
    cameraActive: mode === "loading" || mode === "ready" || mode === "preview",
  };
}
