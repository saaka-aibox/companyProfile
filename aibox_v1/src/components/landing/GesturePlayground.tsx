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
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getVenue, venuePresets, type VenueId } from "./playground/venue-presets";
import {
  boothOptions,
  EMPTY_PHOTO_TASK,
  EMPTY_VISITOR_HAND,
  VISITOR_GUEST,
  photoTaskBusy,
  type BoothKind,
  type InteractionMode,
  type ModelStatus,
  type PhotoTask,
  type SceneController,
  type ScenePhoto,
  type VisitorHand,
} from "./playground/playground-types";
import { usePlaygroundControls } from "./playground/usePlaygroundControls";
import { playgroundGuide } from "./playground/playground-guide";
import { PhotoTaskPanel } from "./playground/PhotoTaskPanel";
import { ScenePhotoPreview } from "./playground/ScenePhotoPreview";
import { PlaygroundCameraControls } from "./playground/PlaygroundCameraControls";
import { VisitorSessionPanel } from "./playground/VisitorSessionPanel";
import { useVisitorPhoto } from "./playground/useVisitorPhoto";
import { captureFrameAspect } from "./playground/visitor-photostrip";
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
  { id: "guest", name: "Move You", icon: UserRound },
  { id: "orbit", name: "Orbit scene", icon: Orbit },
  { id: "pan", name: "Pan scene", icon: Move },
  { id: "booth", name: "Turn booth", icon: Box },
] as const;

export function GesturePlayground({ showHeading = true }: { showHeading?: boolean }) {
  const { resolvedTheme } = useTheme();
  const stageRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<BoothPose>({ x: 0, y: 0 });
  const controllerRef = useRef<SceneController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handRef = useRef<VisitorHand>({ ...EMPTY_VISITOR_HAND });
  const photoUrlRef = useRef<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boothKind, setBoothKind] = useState<BoothKind>("portable");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("guest");
  const [venue, setVenue] = useState<VenueId>("wedding");
  const [selectedGuest, setSelectedGuest] = useState(VISITOR_GUEST);
  const [ambientMotion, setAmbientMotion] = useState(true);
  const [visualsActive, setVisualsActive] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [photoTask, setPhotoTask] = useState<PhotoTask>(EMPTY_PHOTO_TASK);
  const [photo, setPhoto] = useState<ScenePhoto | null>(null);
  const [flash, setFlash] = useState(false);
  const activeVenue = getVenue(venue);
  const activeBooth = boothOptions.find((item) => item.id === boothKind)!;
  const visitorSelected = selectedGuest === VISITOR_GUEST;
  const onPhoto = useCallback((nextPhoto: ScenePhoto) => {
    if (photoUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = nextPhoto.src;
    setPhoto(nextPhoto);
    setFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(false), 650);
  }, []);
  const visitor = useVisitorPhoto({
    videoRef,
    handRef,
    venue,
    boothKind,
    selectedGuest,
    dark: resolvedTheme === "dark",
    onPhoto,
  });
  const controls = usePlaygroundControls(stageRef, poseRef, controllerRef, interactionMode, {
    videoRef,
    handRef,
    selectedGuest,
    task: photoTask,
    visitorReady: visitor.assetReady && boothKind === "portable" && modelStatus === "ready",
  });
  const guide = playgroundGuide(
    boothKind,
    photoTask,
    controls.mode,
    controls.detected,
    controls.pinching,
    controls.hasExplored,
    visitorSelected,
    visitor.shotCount,
  );
  const busy = photoTaskBusy(photoTask);
  const resetVisitorPhotos = visitor.reset;
  const handlePhotoTask = useCallback(
    (next: PhotoTask) => {
      setPhotoTask(next);
      if (next.phase === "idle") resetVisitorPhotos();
    },
    [resetVisitorPhotos],
  );

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
      if (photoUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(photoUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (visitorSelected && ["idle", "error", "preview"].includes(controls.mode))
      controllerRef.current?.cancelTask();
  }, [controls.mode, visitorSelected]);

  useEffect(() => {
    const cancelHiddenSession = () => {
      if (document.hidden && visitorSelected) controllerRef.current?.cancelTask();
    };
    document.addEventListener("visibilitychange", cancelHiddenSession);
    return () => document.removeEventListener("visibilitychange", cancelHiddenSession);
  }, [visitorSelected]);

  const onGuestSelect = useCallback((guest: number) => {
    setSelectedGuest(guest);
    setInteractionMode(guest === VISITOR_GUEST ? "guest" : "orbit");
  }, []);

  function chooseBooth(kind: BoothKind) {
    setBoothKind(kind);
    setInteractionMode(kind === "portable" && visitorSelected ? "guest" : "orbit");
    controls.resetView();
  }

  function chooseVenue(id: VenueId) {
    setVenue(id);
    controls.resetView();
  }

  function resetVisitorSession() {
    controllerRef.current?.cancelTask();
    visitor.reset();
  }

  function clearPhoto() {
    if (photoUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhoto(null);
    if (photoTask.phase === "captured" && photoTask.guest === photo?.guest) resetVisitorSession();
  }

  const hint =
    controls.mode === "ready" && controls.pinching
      ? interactionMode === "guest"
        ? "Pinch held · moving You / Guest 06"
        : interactionMode === "booth"
          ? "Pinch held · turning the booth"
          : "Pinch held · exploring the scene"
      : interactionMode === "guest"
        ? "Drag or pinch to move You · arrow keys work too"
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
          <p>Join as Guest 06. Move with your hand, pose at AIBox, and keep your own photostrip.</p>
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
            aria-label="Interactive AIBox venue. Guest 06 represents you. In Move You mode, drag or use arrow keys to walk. Select Orbit scene to look around, or click another guest. Home resets the view."
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
                  <small>at the event</small>
                  <strong>05 + You</strong>
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
                onTask={handlePhotoTask}
                onPhoto={onPhoto}
                videoRef={videoRef}
                handRef={handRef}
                cameraActive={controls.cameraActive}
                visitorReady={visitor.assetReady && controls.mode === "ready"}
                onVisitorCapture={visitor.capture}
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
                <small>
                  {visitorSelected
                    ? `photo ${Math.min(visitor.shotCount + 1, 4)} / 4 · hold ✌`
                    : "hold that pose"}
                </small>
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
                disabled={
                  (id === "booth" && (boothKind === "fixed" || busy)) ||
                  (id === "guest" &&
                    (!visitorSelected || boothKind === "fixed" || photoTask.phase !== "idle"))
                }
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
          <div
            id="visitor-photo-studio"
            className={`visitor-photo-studio${visitorSelected && boothKind === "portable" ? " is-visitor" : ""}`}
          >
            <PlaygroundCameraControls
              controls={controls}
              visitorSelected={visitorSelected && boothKind === "portable"}
              countdown={visitorSelected && photoTask.phase === "countdown" ? photoTask.countdown : null}
              shotNumber={Math.min(visitor.shotCount + 1, 4)}
              photoAspect={
                visitorSelected && boothKind === "portable" ? captureFrameAspect(visitor.frame) : undefined
              }
            />
            {visitorSelected && boothKind === "portable" && (
              <VisitorSessionPanel
                session={visitor}
                task={photoTask}
                status={modelStatus}
                cameraMode={controls.mode}
                cameraActive={controls.cameraActive}
                peaceProgress={controls.peaceProgress}
                onEnableCamera={controls.enableCamera}
                onSend={() => controllerRef.current?.sendGuest()}
                onReset={resetVisitorSession}
                onFrameChange={(id) => {
                  resetVisitorSession();
                  visitor.selectFrame(id);
                }}
              />
            )}
          </div>
          <ScenePhotoPreview photo={photo} onClear={clearPhoto} />
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
          >
            <p className="photo-task-status">
              You control Guest 06. Move through the scene, then open your camera studio below to take four
              real photos.
            </p>
            <a className="button profile-button-ink guest-task-button" href="#visitor-photo-studio">
              Open my camera studio ↗
            </a>
          </PhotoTaskPanel>
          <p className="scene-preview-note">
            Guest 06 uses your camera for real photos. Other guests are simulations. Camera video and photo
            results stay in this browser.
          </p>
        </aside>
      </div>
    </section>
  );
}
