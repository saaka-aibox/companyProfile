"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cameraErrorMessage, cameraUnsupportedMessage, openCamera, stopStream, streamIsLive } from "./capture";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

/**
 * Owns the single local camera track for the page. Re-acquires it when the tab comes back
 * (iOS stops capture in the background) and stops it on unmount.
 */
export function useLocalCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const boundRef = useRef<HTMLVideoElement | null>(null);
  const hiddenRef = useRef<HTMLVideoElement | null>(null);
  const wantedRef = useRef(false);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);

  const attachTo = useCallback((video: HTMLVideoElement, s: MediaStream) => {
    if (video.srcObject !== s) video.srcObject = s;
    void video.play().catch(() => undefined);
  }, []);

  const start = useCallback(async () => {
    wantedRef.current = true;
    if (busyRef.current) return;
    const unsupported = cameraUnsupportedMessage();
    if (unsupported) {
      setError(unsupported);
      setStatus("error");
      return;
    }
    if (streamIsLive(streamRef.current)) {
      setStatus("ready");
      return;
    }
    busyRef.current = true;
    setError(null);
    setStatus("requesting");
    try {
      const next = await openCamera();
      if (!aliveRef.current || !wantedRef.current) {
        stopStream(next);
        return;
      }
      stopStream(streamRef.current);
      streamRef.current = next;
      next.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current !== next || !aliveRef.current) return;
          setStatus("error");
          setError("The camera was disconnected or access was revoked. Reconnect it or allow Camera in site settings, then try again.");
        };
      });
      if (boundRef.current) attachTo(boundRef.current, next);
      if (hiddenRef.current) attachTo(hiddenRef.current, next);
      setStream(next);
      setStatus("ready");
    } catch (cause) {
      if (!aliveRef.current) return;
      setError(cameraErrorMessage(cause));
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [attachTo]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    stopStream(streamRef.current);
    streamRef.current = null;
    hiddenRef.current?.remove();
    hiddenRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    const onVisible = () => {
      if (document.visibilityState === "visible" && wantedRef.current && !streamIsLive(streamRef.current)) void start();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      wantedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      hiddenRef.current?.remove();
    };
  }, [start]);

  /** Register the visible self-preview so it doubles as the capture source. */
  const bindVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      boundRef.current = video;
      if (video && streamRef.current) attachTo(video, streamRef.current);
    },
    [attachTo],
  );

  /** The video element to grab a still / run hand tracking from. */
  const getVideo = useCallback((): HTMLVideoElement | null => {
    const bound = boundRef.current;
    if (bound && bound.isConnected && bound.videoWidth > 0) return bound;
    const s = streamRef.current;
    if (!s) return null;
    if (!hiddenRef.current) {
      const hidden = document.createElement("video");
      hidden.muted = true;
      hidden.playsInline = true;
      hidden.setAttribute("aria-hidden", "true");
      hidden.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
      document.body.appendChild(hidden);
      hiddenRef.current = hidden;
    }
    attachTo(hiddenRef.current, s);
    return hiddenRef.current;
  }, [attachTo]);

  return { stream, status, error, start, stop, bindVideo, getVideo };
}

export type LocalCamera = ReturnType<typeof useLocalCamera>;
