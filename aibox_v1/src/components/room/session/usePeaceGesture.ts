"use client";

import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";

// Same assets as src/components/landing/useGestureCamera.ts
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const INTERVAL_MS = 1000 / 12;
const GRACE_MS = 1000;
const DEBOUNCE_MS = 300;

async function createRecognizer(): Promise<GestureRecognizer> {
  const { FilesetResolver, GestureRecognizer: Recognizer } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options = { runningMode: "VIDEO" as const, numHands: 1 };
  try {
    return await Recognizer.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" } });
  } catch {
    return Recognizer.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" } });
  }
}

export type PeaceEngine = "off" | "loading" | "ready" | "failed";

/**
 * Lazy MediaPipe peace detection. The model loads once `preload` is true (trigger = peace);
 * inference only runs (~12 fps) while `active` (phase = pose_ready). Reports changes only,
 * stabilised by a 300 ms debounce.
 */
export function usePeaceGesture(opts: {
  preload: boolean;
  active: boolean;
  getVideo: () => HTMLVideoElement | null;
  onChange: (peace: boolean) => void;
}) {
  const { preload, active, getVideo } = opts;
  const [engine, setEngine] = useState<PeaceEngine>("off");
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const changeRef = useRef(opts.onChange);
  const videoRef = useRef(getVideo);
  useEffect(() => {
    changeRef.current = opts.onChange;
    videoRef.current = getVideo;
  });

  useEffect(() => {
    if (!preload || recognizerRef.current) return;
    let cancelled = false;
    setEngine("loading");
    createRecognizer().then(
      (r) => {
        if (cancelled) return r.close();
        recognizerRef.current = r;
        setEngine("ready");
      },
      () => !cancelled && setEngine("failed"),
    );
    return () => {
      cancelled = true;
    };
  }, [preload]);

  useEffect(
    () => () => {
      recognizerRef.current?.close();
      recognizerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!active || engine !== "ready") return;
    const recognizer = recognizerRef.current;
    if (!recognizer) return;
    const startedAt = performance.now();
    let reported = false;
    let raw = false;
    let rawSince = startedAt;
    let lastRun = 0;
    let lastVideoTime = -1;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      const video = videoRef.current();
      if (video && !document.hidden && video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastRun >= INTERVAL_MS) {
        lastRun = now;
        lastVideoTime = video.currentTime;
        try {
          const top = recognizer.recognizeForVideo(video, now).gestures?.[0]?.[0];
          const seen = !!top && top.categoryName === "Victory" && top.score > 0.55;
          if (seen !== raw) {
            raw = seen;
            rawSince = now;
          }
        } catch {
          setEngine("failed");
          return;
        }
      }
      if (now - startedAt > GRACE_MS && raw !== reported && now - rawSince >= DEBOUNCE_MS) {
        reported = raw;
        changeRef.current(reported);
      }
      timer = setTimeout(tick, INTERVAL_MS / 2);
    };
    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      // The hand must be lowered again before the next round can trigger.
      if (reported) changeRef.current(false);
    };
  }, [active, engine]);

  return engine;
}
