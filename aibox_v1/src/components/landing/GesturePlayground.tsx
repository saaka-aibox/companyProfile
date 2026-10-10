"use client";

import type { GestureRecognizerResult } from "@mediapipe/tasks-vision";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Camera, Hand, Move3d, RotateCcw, MapPin, Pause, Play, Plus, Minus, Users, Box } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import { useGestureCamera, type CameraMode } from "./useGestureCamera";
import { createPinchRotation } from "./playground/pinch-rotation";
import { getVenue, venuePresets, type VenueId } from "./playground/venue-presets";
import type { ModelStatus } from "./playground/ThreeBoothScene";

const ThreeBoothScene = dynamic(() => import("./playground/ThreeBoothScene").then((module) => module.ThreeBoothScene), { ssr: false });
const PixiGestureOverlay = dynamic(() => import("./playground/PixiGestureOverlay").then((module) => module.PixiGestureOverlay), { ssr: false });

type Theme = "ice" | "amber" | "violet";
type Pose = { x: number; y: number };
type PlaygroundStyle = CSSProperties & { "--booth-accent": string; "--booth-glow": string };
type ThemeChoiceStyle = CSSProperties & { "--choice-color": string };

const themes: { id: Theme; name: string; accent: string; glow: string }[] = [
  { id: "ice", name: "Polar glass", accent: "#73c9ff", glow: "rgba(53, 156, 255, .36)" },
  { id: "amber", name: "Warm gold", accent: "#ffc47c", glow: "rgba(255, 154, 65, .34)" },
  { id: "violet", name: "Ultraviolet", accent: "#bb9aff", glow: "rgba(143, 102, 255, .38)" },
];

function namedGesture(result: GestureRecognizerResult) {
  const name = result.gestures?.[0]?.[0]?.categoryName;
  if (!name || name === "None") return null;
  return name.replaceAll("_", " ");
}

function playgroundGuide(mode: CameraMode, detected: boolean, hasRotated: boolean, pinching: boolean) {
  if (mode === "requesting") return { step: "02 / camera", title: "Allow your camera.", copy: "Choose Allow in your browser prompt. Your video stays on this device." };
  if (mode === "loading") return { step: "02 / camera", title: "Looking good.", copy: "Your camera is live. Hand control is getting ready." };
  if (mode === "error") return { step: "02 / camera", title: "Camera needs attention.", copy: "Read the message in the controls. You can keep exploring by dragging the booth." };
  if (mode === "preview") return { step: "03 / gesture", title: "Keep exploring.", copy: "Your camera preview works. Retry hand control, or continue with drag and arrow keys." };
  if (mode === "ready" && pinching) return { step: "04 / rotate", title: "You've got it.", copy: "Keep pinching and move your hand to rotate. Release to leave the booth at that angle." };
  if (mode === "ready" && detected) return { step: "03 / pinch", title: "Pinch to pick it up.", copy: "Bring your thumb and index finger together, then move left or right. Release and regrip for another turn." };
  if (mode === "ready") return { step: "03 / gesture", title: "Show your hand.", copy: "Keep your thumb and index finger clearly in view. Pinch them together to grab the booth." };
  if (hasRotated) return { step: "02 / camera", title: "Now, bring your hands in.", copy: "Enable your camera to explore with natural hand gestures." };
  return { step: "01 / explore", title: "Give it a spin.", copy: "Drag the booth or use the arrow keys. Press Home to recenter." };
}

export function GesturePlayground({ showHeading = true }: { showHeading?: boolean }) {
  const { resolvedTheme } = useTheme();
  const previousGestureRef = useRef<string | null>(null);
  const pointerRef = useRef<{ x: number; y: number; pose: Pose } | null>(null);
  const pinchRef = useRef(createPinchRotation());
  const cameraAspectRef = useRef(4 / 3);
  const stageRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose>({ x: 0, y: 0 });
  const [theme, setTheme] = useState<Theme>("ice");
  const [gesture, setGesture] = useState("Camera off — drag or use arrow keys");
  const [detected, setDetected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [visualsActive, setVisualsActive] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [pinching, setPinching] = useState(false);
  const [venue, setVenue] = useState<VenueId>("wedding");
  const [ambientMotion, setAmbientMotion] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hasRotated, setHasRotated] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTheme = themes.find((item) => item.id === theme) ?? themes[0]!;
  const activeVenue = getVenue(venue);

  const applyPose = useCallback((nextPose: Pose) => {
    poseRef.current = nextPose;
    stageRef.current?.style.setProperty("--booth-tilt-x", `${nextPose.y}deg`);
    stageRef.current?.style.setProperty("--booth-tilt-y", `${nextPose.x}deg`);
    stageRef.current?.dispatchEvent(new Event("aibox:pose"));
    if (Math.abs(nextPose.x) > 4 || Math.abs(nextPose.y) > 4) setHasRotated(true);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisualsActive(true);
        observer.disconnect();
      }
    }, { threshold: 0.05 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const markModelStatus = useCallback((status: ModelStatus) => setModelStatus(status), []);

  const handleGesture = useCallback((result: GestureRecognizerResult) => {
    const landmarks = result.landmarks?.[0];
    const grip = pinchRef.current.update(landmarks, poseRef.current, cameraAspectRef.current);
    const point = grip.point;
    setDetected(Boolean(point));
    setPinching(grip.pinching);
    stageRef.current?.dispatchEvent(new CustomEvent("aibox:hand", {
      detail: { x: point?.x ?? 0.5, y: point?.y ?? 0.5, visible: Boolean(point), pinching: grip.pinching },
    }));
    if (!point) {
      setGesture("Move your hand into view");
      previousGestureRef.current = null;
      return;
    }

    if (pointerRef.current) {
      pinchRef.current.reset(); setPinching(false);
      setGesture("Dragging the booth — release to use your hand");
      return;
    }
    if (grip.pinching && grip.pose) {
      setGesture("Pinch held — move your hand to rotate");
      applyPose(grip.pose);
      previousGestureRef.current = null;
      return;
    }

    const nextGesture = namedGesture(result);
    if (!nextGesture) {
      setGesture("Hand detected — pinch thumb and index finger");
      previousGestureRef.current = null;
      return;
    }

    setGesture(nextGesture);
    if (nextGesture !== previousGestureRef.current) {
      previousGestureRef.current = nextGesture;
      stageRef.current?.dispatchEvent(new Event("aibox:gesture"));
      if (nextGesture === "Victory") {
        setFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlash(false), 650);
      } else if (nextGesture === "Thumb Up") {
        setTheme("amber");
      }
    }
  }, [applyPose]);

  const { videoRef, mode, error, cameraActive, startCamera, stopCamera } = useGestureCamera(handleGesture);
  const cameraStatus = {
    idle: "Camera off — drag or use arrow keys",
    requesting: "Choose Allow in your browser's camera prompt",
    loading: "Camera on — loading hand control…",
    ready: gesture,
    preview: "Camera on — hand control unavailable",
    error: "Camera unavailable — see the guidance below",
  }[mode];
  const guide = playgroundGuide(mode, detected, hasRotated, pinching);

  useEffect(() => {
    if (mode !== "ready") {
      pinchRef.current.reset();
      stageRef.current?.dispatchEvent(new CustomEvent("aibox:hand", { detail: { x: .5, y: .5, visible: false, pinching: false } }));
    }
  }, [mode]);

  function resetGesture() {
    previousGestureRef.current = null;
    pinchRef.current.reset();
    setPinching(false);
    setDetected(false);
    setGesture("Move your hand into view");
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = null;
    setFlash(false);
    stageRef.current?.dispatchEvent(new CustomEvent("aibox:hand", { detail: { x: 0.5, y: 0.5, visible: false } }));
  }

  function enableCamera() {
    resetGesture();
    void startCamera();
  }

  function disableCamera() {
    stopCamera();
    resetGesture();
  }

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    pinchRef.current.reset();
    pointerRef.current = { x: event.clientX, y: event.clientY, pose: poseRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    if (!start) return;
    applyPose({
      x: start.pose.x + (event.clientX - start.x) * 0.35,
      y: Math.max(-25, Math.min(25, start.pose.y - (event.clientY - start.y) * 0.16)),
    });
  }

  function resetView() {
    setZoom(1);
    pinchRef.current.reset();
    setPinching(false);
    applyPose({ x: 0, y: 0 });
    setGesture(mode === "ready" ? "View centered — pinch to rotate" : "Drag to explore the model");
  }

  function onStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const current = poseRef.current;
    const changes: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: 5 }, ArrowDown: { x: 0, y: -5 },
    };
    if (event.key === "Home") {
      event.preventDefault();
      resetView();
    } else if (changes[event.key]) {
      event.preventDefault();
      const delta = changes[event.key];
      pinchRef.current.reset();
      applyPose({ x: current.x + delta.x, y: Math.max(-25, Math.min(25, current.y + delta.y)) });
    }
  }

  return (
    <section className={`gesture-playground section-shell${flash && mode === "ready" ? " is-flashing" : ""}`} id="playground" aria-label="Interactive AIBox playground">
      {showHeading && <div className="playground-heading">
        <div>
          <p className="section-kicker">A closer look · interactive demo</p>
          <h2 id="playground-title">Meet it <span>in three dimensions.</span></h2>
        </div>
        <p>Move your hand to explore MagicBooth. No touch, no app—just a more natural way to make a moment.</p>
      </div>}

      <div className="playground-console">
        <div className="playground-viewport" style={{ "--booth-accent": activeTheme.accent, "--booth-glow": activeTheme.glow } as PlaygroundStyle}>
          <div
            className="playground-stage"
            data-renderer={modelStatus === "ready" ? "webgl" : "fallback"}
            data-venue={venue}
            data-pinching={mode === "ready" && pinching}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { pointerRef.current = null; }}
            onPointerCancel={() => { pointerRef.current = null; }}
            onLostPointerCapture={() => { pointerRef.current = null; }}
            onKeyDown={onStageKeyDown}
            tabIndex={0}
            ref={stageRef}
            role="group"
            aria-label="Interactive AIBox model. Drag, use arrow keys, or enable the camera and pinch to rotate. Press Home to recenter."
          >
            <div className="stage-caption">
              <span><i aria-hidden="true" />{activeVenue.name}<small>isometric / concept scene</small></span>
              <span>{modelStatus === "ready" ? "3D LIVE" : modelStatus === "loading" ? "LOADING…" : "PHOTO PREVIEW"}</span>
            </div>
            <div className="scene-summary" aria-label="Concept scene overview">
              <span><Box size={16} aria-hidden="true" /><span><small>the booth</small><strong>AIBox</strong></span></span>
              <span><Users size={16} aria-hidden="true" /><span><small>virtual guests</small><strong>{activeVenue.guests.toString().padStart(2, "0")}</strong></span></span>
            </div>
            <div className="scene-view-controls" role="group" aria-label="Scene view">
              <button type="button" onClick={() => setZoom(value => Math.min(1.6, +(value + .15).toFixed(2)))} disabled={zoom >= 1.6} aria-label="Zoom in"><Plus size={16} aria-hidden="true" /></button>
              <button type="button" onClick={() => setZoom(value => Math.max(.8, +(value - .15).toFixed(2)))} disabled={zoom <= .8} aria-label="Zoom out"><Minus size={16} aria-hidden="true" /></button>
              <button type="button" onClick={resetView} aria-label="Reset scene view"><RotateCcw size={15} aria-hidden="true" /></button>
            </div>
            {modelStatus !== "ready" && <div className="playground-model-fallback"><Image src="/bg.png" alt="AIBox booth reference while the 3D model loads" fill sizes="(max-width: 760px) 100vw, 800px" /><span role="status">{modelStatus === "loading" ? "Loading the booth…" : modelStatus === "unsupported" ? "3D is unavailable in this browser. Explore the product photo instead." : "The 3D model couldn’t load. Refresh to try again."}</span></div>}
            {visualsActive && <ThreeBoothScene poseRef={poseRef} accent={activeTheme.accent} venue={venue} ambientMotion={ambientMotion} dark={resolvedTheme === "dark"} zoom={zoom} onStatus={markModelStatus} />}
            {visualsActive && <PixiGestureOverlay accent={activeTheme.accent} />}
            <div className="stage-hint"><Move3d size={14} aria-hidden="true" />{mode === "ready" && pinching ? "Grip held · move to rotate" : mode === "ready" ? "Pinch to grab · release to let go" : "Drag to explore · arrow keys work too"}</div>
          </div>
          <div className="playground-coach" key={guide.step} aria-live="polite">
            <span>{guide.step}</span>
            <strong>{guide.title}</strong>
            <p>{guide.copy}</p>
            <div className="playground-coach-progress" data-step={guide.step.slice(0, 2)} aria-hidden="true"><i /><i /><i /><i /></div>
          </div>
        </div>

        <aside className="playground-controls" aria-label="Playground controls">
          <div className="venue-control">
            <span className="control-label"><MapPin size={12} aria-hidden="true" /> CHOOSE A SCENE</span>
            <div className="venue-options" role="group" aria-label="Choose a venue">{venuePresets.map(item => <button type="button" key={item.id} aria-pressed={venue === item.id} onClick={() => setVenue(item.id)}>{item.name}</button>)}</div>
            <p>{activeVenue.description}</p>
            <button type="button" className="venue-motion-toggle" aria-pressed={ambientMotion} onClick={() => setAmbientMotion(value => !value)}>{ambientMotion ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}{ambientMotion ? "Pause scene animation" : "Play scene animation"}</button>
          </div>
          <div className="camera-window">
            <video ref={videoRef} className={cameraActive ? "gesture-video is-visible" : "gesture-video"} autoPlay muted playsInline aria-label="Mirrored camera preview" onLoadedMetadata={event => { const video = event.currentTarget; cameraAspectRef.current = video.videoWidth / Math.max(video.videoHeight, 1); }} />
            {!cameraActive && <div className="camera-placeholder"><Camera className="camera-icon" size={24} strokeWidth={1.5} /><span>{mode === "requesting" ? "Waiting for permission" : "Camera preview"}</span><small>{mode === "requesting" ? "Choose Allow in your browser prompt" : "Enable your camera to try hand control"}</small></div>}
            <span className={`camera-live ${cameraActive ? "is-on" : ""}`}><i />{cameraActive ? "LIVE" : "CAMERA OFF"}</span>
          </div>

          <div className="gesture-readout">
            <span className="control-label"><Hand size={12} aria-hidden="true" /> GESTURE INPUT</span>
            <div className="gesture-result" role="status"><span className={`detection-dot${detected && mode === "ready" ? " is-detected" : ""}`} />{cameraStatus}</div>
            <p>Pinch + move to rotate / release to let go / victory sign for a flash / thumbs up for warm light</p>
          </div>

          <div className="theme-control">
            <span className="control-label">LIGHT SIGNATURE</span>
            <div className="theme-options">
              {themes.map((item) => (
                <button key={item.id} className={`theme-choice${theme === item.id ? " is-selected" : ""}`} onClick={() => setTheme(item.id)} aria-label={`Set ${item.name} lighting`} aria-pressed={theme === item.id} title={item.name} style={{ "--choice-color": item.accent } as ThemeChoiceStyle} />
              ))}
              <span>{activeTheme.name}</span>
            </div>
          </div>

          {error && <p className="playground-error" role="alert">{error}</p>}
          <div className="playground-actions">
            {cameraActive && <button type="button" className="button button-outline" onClick={disableCamera}>Turn off camera</button>}
            {mode === "requesting" && <button type="button" className="button button-outline" onClick={disableCamera}>Cancel camera request</button>}
            {(mode === "idle" || mode === "error" || mode === "preview") && (
              <button type="button" className="button button-primary" onClick={enableCamera}>
                <Camera size={15} aria-hidden="true" />
                {mode === "preview" ? "Retry hand control" : mode === "error" ? "Try camera again" : "Enable camera"}
              </button>
            )}
            <button className="reset-button" onClick={resetView}><RotateCcw size={13} aria-hidden="true" /> Recenter view</button>
          </div>
          <p className="privacy-note">Choose Enable camera, then Allow when your browser asks. Your video stays in this browser. Microphone access is never requested.</p>
          <p className="scene-preview-note">Illustrated venues and virtual guests. Explore where AIBox could fit into your next event.</p>
        </aside>
      </div>
    </section>
  );
}
