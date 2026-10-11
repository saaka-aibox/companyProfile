"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Box,
  Building2,
  MapPin,
  Minus,
  Move,
  Move3d,
  Orbit,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getVenue, venuePresets, type VenueId } from "./playground/venue-presets";
import {
  boothOptions,
  EMPTY_PHOTO_TASK,
  photoTaskBusy,
  type BoothKind,
  type InteractionMode,
  type ModelStatus,
  type PhotoTask,
  type SceneController,
  type ScenePhoto,
} from "./playground/playground-types";
import { usePlaygroundControls } from "./playground/usePlaygroundControls";
import { playgroundGuide } from "./playground/playground-guide";
import { PhotoTaskPanel } from "./playground/PhotoTaskPanel";
import { ScenePhotoPreview } from "./playground/ScenePhotoPreview";
import { PlaygroundCameraControls } from "./playground/PlaygroundCameraControls";
import type { BoothPose } from "./playground/pinch-rotation";

const ThreeBoothScene = dynamic(
  () => import("./playground/ThreeBoothScene").then((module) => module.ThreeBoothScene),
  { ssr: false },
);
const PixiGestureOverlay = dynamic(
  () => import("./playground/PixiGestureOverlay").then((module) => module.PixiGestureOverlay),
  { ssr: false },
);

const viewModes = [
  { id: "orbit", name: "Orbit scene", icon: Orbit },
  { id: "pan", name: "Pan scene", icon: Move },
  { id: "booth", name: "Turn booth", icon: Box },
] as const;

export function GesturePlayground({ showHeading = true }: { showHeading?: boolean }) {
  const { resolvedTheme } = useTheme();
  const stageRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<BoothPose>({ x: 0, y: 0 });
  const controllerRef = useRef<SceneController | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boothKind, setBoothKind] = useState<BoothKind>("portable");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("orbit");
  const [venue, setVenue] = useState<VenueId>("wedding");
  const [selectedGuest, setSelectedGuest] = useState(0);
  const [ambientMotion, setAmbientMotion] = useState(true);
  const [visualsActive, setVisualsActive] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [photoTask, setPhotoTask] = useState<PhotoTask>(EMPTY_PHOTO_TASK);
  const [photo, setPhoto] = useState<ScenePhoto | null>(null);
  const [flash, setFlash] = useState(false);
  const activeVenue = getVenue(venue);
  const activeBooth = boothOptions.find((item) => item.id === boothKind)!;
  const controls = usePlaygroundControls(stageRef, poseRef, controllerRef, interactionMode);
  const guide = playgroundGuide(
    boothKind,
    photoTask,
    controls.mode,
    controls.detected,
    controls.pinching,
    controls.hasExplored,
  );
  const busy = photoTaskBusy(photoTask);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisualsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    },
    [],
  );

  const onPhoto = useCallback((nextPhoto: ScenePhoto) => {
    setPhoto(nextPhoto);
    setFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(false), 650);
  }, []);

  const onGuestSelect = useCallback((guest: number) => setSelectedGuest(guest), []);

  function chooseBooth(kind: BoothKind) {
    setBoothKind(kind);
    setInteractionMode("orbit");
    controls.resetView();
  }

  function chooseVenue(id: VenueId) {
    setVenue(id);
    setSelectedGuest(0);
    controls.resetView();
  }

  const hint =
    controls.mode === "ready" && controls.pinching
      ? interactionMode === "booth"
        ? "Pinch held · turning the booth"
        : "Pinch held · exploring the scene"
      : interactionMode === "pan"
        ? "Drag to pan · scroll to zoom"
        : interactionMode === "booth"
          ? "Drag to turn the portable box"
          : "Drag to orbit · shift + drag to pan · scroll to zoom";

  return (
    <section
      className={`gesture-playground section-shell${flash ? " is-flashing" : ""}`}
      id="playground"
      aria-label="Interactive AIBox playground"
    >
      {showHeading && (
        <div className="playground-heading">
          <div>
            <p className="section-kicker">A closer look · interactive demo</p>
            <h2>
              Make a little <span>moment.</span>
            </h2>
          </div>
          <p>Explore the venue, meet a virtual guest, and send them to AIBox for a photo.</p>
        </div>
      )}
      <div className="playground-console">
        <div
          className="playground-viewport"
          style={{ "--booth-accent": activeBooth.accent } as CSSProperties}
        >
          <div
            className="playground-stage"
            ref={stageRef}
            tabIndex={0}
            role="group"
            aria-label="Interactive AIBox venue. Drag to orbit, shift-drag to pan, or scroll to zoom. Click a guest to select them. Arrow keys explore; Home resets the view."
            data-renderer={modelStatus === "ready" ? "webgl" : "fallback"}
            data-venue={venue}
            data-booth={boothKind}
            data-pinching={controls.mode === "ready" && controls.pinching}
            data-interaction={interactionMode}
            {...controls.stageEvents}
          >
            <div className="stage-caption">
              <span>
                <i aria-hidden="true" />
                {activeVenue.name}
                <small>cutaway / virtual venue</small>
              </span>
              <span>
                {modelStatus === "ready"
                  ? boothKind === "fixed"
                    ? "CONCEPT"
                    : "3D LIVE"
                  : modelStatus === "loading"
                    ? "LOADING…"
                    : "PHOTO PREVIEW"}
              </span>
            </div>
            <div className="scene-summary" aria-label="Scene overview">
              <span>
                <Box size={16} aria-hidden="true" />
                <span>
                  <small>the booth</small>
                  <strong>{activeBooth.name}</strong>
                </span>
              </span>
              <span>
                <Users size={16} aria-hidden="true" />
                <span>
                  <small>virtual guests</small>
                  <strong>{activeVenue.guests.toString().padStart(2, "0")}</strong>
                </span>
              </span>
            </div>
            <div className="scene-view-controls" role="group" aria-label="Scene view">
              <button
                type="button"
                onClick={() => controllerRef.current?.zoomBy(0.15)}
                disabled={modelStatus !== "ready"}
                aria-label="Zoom in"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => controllerRef.current?.zoomBy(-0.15)}
                disabled={modelStatus !== "ready"}
                aria-label="Zoom out"
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={controls.resetView} aria-label="Reset scene view">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
            </div>
            {modelStatus !== "ready" && (
              <div className="playground-model-fallback">
                <Image
                  src="/bg.png"
                  alt="AIBox booth reference while the 3D scene loads"
                  fill
                  sizes="(max-width: 760px) 100vw, 800px"
                />
                <span role="status">
                  {modelStatus === "loading"
                    ? "Loading the portable booth…"
                    : modelStatus === "unsupported"
                      ? "3D is unavailable in this browser. Explore the product photo instead."
                      : "The portable model couldn't load. Refresh to try again, or explore the Fixed concept."}
                </span>
              </div>
            )}
            {visualsActive && (
              <ThreeBoothScene
                poseRef={poseRef}
                controllerRef={controllerRef}
                boothKind={boothKind}
                selectedGuest={selectedGuest}
                interactionMode={interactionMode}
                accent={activeBooth.accent}
                venue={venue}
                ambientMotion={ambientMotion}
                dark={resolvedTheme === "dark"}
                onStatus={setModelStatus}
                onGuestSelect={onGuestSelect}
                onTask={setPhotoTask}
                onPhoto={onPhoto}
              />
            )}
            {visualsActive && <PixiGestureOverlay accent={activeBooth.accent} />}
            {boothKind === "fixed" && modelStatus === "ready" && (
              <div className="fixed-booth-notice">
                <span className="profile-micro">fixed booth / in development</span>
                <strong>Coming soon.</strong>
                <p>A permanent home for your next moment.</p>
              </div>
            )}
            {photoTask.phase === "countdown" && (
              <div
                className="scene-countdown"
                role="status"
                aria-label={`Capturing in ${photoTask.countdown} seconds`}
              >
                <span>{photoTask.countdown}</span>
                <small>hold that pose</small>
              </div>
            )}
            <div className="stage-hint">
              <Move3d size={14} aria-hidden="true" />
              {hint}
            </div>
          </div>
          <div className="scene-navigation-modes" role="group" aria-label="Choose how to explore">
            {viewModes.map(({ id, name, icon: Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={interactionMode === id}
                disabled={id === "booth" && (boothKind === "fixed" || busy)}
                onClick={() => setInteractionMode(id)}
              >
                <Icon size={14} aria-hidden="true" />
                {name}
              </button>
            ))}
          </div>
          <div className="playground-coach" key={guide.step} aria-live="polite">
            <span>{guide.step}</span>
            <strong>{guide.title}</strong>
            <p>{guide.copy}</p>
            <div className="playground-coach-progress" data-step={guide.step.slice(0, 2)} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <ScenePhotoPreview photo={photo} />
        </div>
        <aside className="playground-controls" aria-label="Playground controls">
          <div className="booth-control">
            <span className="control-label">
              <Box size={12} aria-hidden="true" /> choose your booth
            </span>
            <div className="booth-options" role="group" aria-label="Choose a booth type">
              {boothOptions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={boothKind === item.id}
                  onClick={() => chooseBooth(item.id)}
                >
                  {item.id === "portable" ? (
                    <Box size={19} aria-hidden="true" />
                  ) : (
                    <Building2 size={19} aria-hidden="true" />
                  )}
                  <strong>{item.name}</strong>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="venue-control">
            <span className="control-label">
              <MapPin size={12} aria-hidden="true" /> choose a scene
            </span>
            <div className="venue-options" role="group" aria-label="Choose a venue">
              {venuePresets.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={venue === item.id}
                  onClick={() => chooseVenue(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p>{activeVenue.description}</p>
            <button
              type="button"
              className="venue-motion-toggle"
              aria-pressed={ambientMotion}
              onClick={() => setAmbientMotion((value) => !value)}
            >
              {ambientMotion ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
              {ambientMotion ? "Pause ambient motion" : "Play ambient motion"}
            </button>
          </div>
          <PhotoTaskPanel
            boothKind={boothKind}
            count={activeVenue.guests}
            selected={selectedGuest}
            task={photoTask}
            status={modelStatus}
            onSelect={onGuestSelect}
            controllerRef={controllerRef}
          />
          <PlaygroundCameraControls controls={controls} />
          <p className="scene-preview-note">
            Virtual venues and guests. The preview is a 3D simulation, captured locally in your browser.
          </p>
        </aside>
      </div>
    </section>
  );
}
