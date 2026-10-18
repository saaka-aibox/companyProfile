"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  captureCameraFrame,
  captureFrames,
  composeVisitorPhotostrip,
  STRIP_SHOT_COUNT,
} from "./visitor-photostrip";
import { VISITOR_GUEST, type BoothKind, type ScenePhoto, type VisitorHand } from "./playground-types";
import type { VenueId } from "./venue-presets";

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  handRef: RefObject<VisitorHand>;
  venue: VenueId;
  boothKind: BoothKind;
  selectedGuest: number;
  dark: boolean;
  onPhoto: (photo: ScenePhoto) => void;
};

/** Owns local camera snapshots and print composition; no photos leave the browser. */
export function useVisitorPhoto({
  videoRef,
  handRef,
  venue,
  boothKind,
  selectedGuest,
  dark,
  onPhoto,
}: Options) {
  const [frameId, setFrameId] = useState(captureFrames[0].id);
  const [asset, setAsset] = useState<{ src: string; ready: boolean; error: string | null }>({
    src: "",
    ready: false,
    error: null,
  });
  const [shotCount, setShotCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const frame = captureFrames.find((item) => item.id === frameId) ?? captureFrames[0];
  const assetReady = asset.src === frame.src && asset.ready;
  const artworkRef = useRef<HTMLImageElement | null>(null);
  const shotsRef = useRef<HTMLCanvasElement[]>([]);
  const generationRef = useRef(0);

  const reset = useCallback(() => {
    generationRef.current += 1;
    shotsRef.current.forEach((shot) => {
      shot.width = shot.height = 0;
    });
    shotsRef.current = [];
    setShotCount(0);
    setError(null);
  }, []);

  useEffect(() => {
    artworkRef.current = null;
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      artworkRef.current = image;
      setAsset({ src: frame.src, ready: true, error: null });
    };
    image.onerror = () =>
      setAsset({
        src: frame.src,
        ready: false,
        error: "This photostrip couldn't load. Choose another frame, then try again.",
      });
    image.src = frame.src;
    return () => {
      image.onload = image.onerror = null;
      artworkRef.current = null;
    };
  }, [frame.src]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      shotsRef.current.forEach((shot) => {
        shot.width = shot.height = 0;
      });
      shotsRef.current = [];
    };
  }, [venue, boothKind, selectedGuest, dark]);

  const capture = useCallback(async () => {
    const generation = generationRef.current;
    try {
      const hand = handRef.current;
      // Require a fresh peace pose at the shutter, as well as at countdown start.
      if (!hand.peace || performance.now() - hand.updatedAt > 450) {
        throw new Error(
          "Keep your peace sign visible until the countdown finishes. Lower your hand, then try again.",
        );
      }
      const artwork = artworkRef.current;
      const video = videoRef.current;
      if (!artwork || !video)
        throw new Error("Wait for your camera and selected photostrip to finish loading.");
      setError(null);
      if (shotsRef.current.length < STRIP_SHOT_COUNT) {
        shotsRef.current.push(captureCameraFrame(video));
        setShotCount(shotsRef.current.length);
      }
      if (shotsRef.current.length < STRIP_SHOT_COUNT) return false;
      const src = await composeVisitorPhotostrip(artwork, frame, shotsRef.current);
      if (generation !== generationRef.current) {
        URL.revokeObjectURL(src);
        throw new Error("The photo session was cancelled.");
      }
      onPhoto({
        src,
        venue,
        guest: VISITOR_GUEST,
        source: "camera",
        width: 1200,
        height: 1800,
        frameName: frame.name,
      });
      shotsRef.current.forEach((shot) => {
        shot.width = shot.height = 0;
      });
      shotsRef.current = [];
      return true;
    } catch (cause) {
      if (generation === generationRef.current) {
        setError(cause instanceof Error ? cause.message : "The photo couldn't be saved. Please try again.");
      }
      throw cause;
    }
  }, [frame, venue, handRef, videoRef, onPhoto]);

  return {
    frame,
    frameId,
    selectFrame: setFrameId,
    assetReady,
    shotCount,
    error: asset.src === frame.src && asset.error ? asset.error : error,
    capture,
    reset,
  };
}
