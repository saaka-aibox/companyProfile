import { Camera, Check, Hand, Send } from "lucide-react";
import { photoTaskBusy, type ModelStatus, type PhotoTask } from "./playground-types";
import { captureFrames, STRIP_SHOT_COUNT } from "./visitor-photostrip";
import type { useVisitorPhoto } from "./useVisitorPhoto";
import type { CameraMode } from "../useGestureCamera";

type Props = {
  session: ReturnType<typeof useVisitorPhoto>;
  task: PhotoTask;
  status: ModelStatus;
  cameraMode: CameraMode;
  cameraActive: boolean;
  peaceProgress: number;
  onEnableCamera: () => void;
  onSend: () => void;
  onReset: () => void;
  onFrameChange: (id: string) => void;
};

const steps = [
  "Enable camera",
  "Move, then go to the booth",
  "Hold ✌ for each of 4 photos",
  "Download your photostrip",
];

export function VisitorSessionPanel({
  session,
  task,
  status,
  cameraMode,
  cameraActive,
  peaceProgress,
  onEnableCamera,
  onSend,
  onReset,
  onFrameChange,
}: Props) {
  const busy = photoTaskBusy(task);
  const complete = task.phase === "captured";
  const step = !cameraActive ? 0 : complete ? 3 : task.phase === "idle" || task.phase === "walking" ? 1 : 2;
  let instruction = "Enable your camera below and choose Allow in the browser prompt.";
  if (cameraActive) {
    instruction =
      task.phase === "walking"
        ? "You are walking to the booth. Wait for your avatar to reach the photo spot."
        : task.phase === "countdown"
          ? `Photo ${Math.min(session.shotCount + 1, STRIP_SHOT_COUNT)} of 4. Keep your peace sign visible for ${task.countdown}…`
          : task.phase === "processing"
            ? "Saving your shot and preparing the photostrip…"
            : complete
              ? "All four photos are ready. Enlarge or download your photostrip below the scene."
              : task.phase === "idle"
                ? "Select Move You, pinch thumb and index finger, then move your hand. Choose Go to photo spot when ready."
                : cameraMode !== "ready"
                  ? "Wait for hand control to load, or use Retry hand control below."
                  : !session.assetReady
                    ? "Your selected photostrip is loading. The shutter will be ready shortly."
                    : session.shotCount === STRIP_SHOT_COUNT
                      ? "All four shots are saved. Lower your hand, then hold ✌ again to retry preparing your photostrip."
                      : session.shotCount
                        ? `${session.shotCount} of 4 saved. Lower your hand, choose another pose, then hold ✌ for the next shot.`
                        : "Frame your face and hand in the camera preview. Hold ✌ still to start a three-second countdown. Keep it visible until the shutter.";
  }
  return (
    <div className="visitor-session">
      <p className="visitor-session-label">
        <span /> you / guest 06
      </p>
      <ol className="visitor-steps" aria-label="Your photo session steps">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined} data-complete={index < step}>
            <span aria-hidden="true">{index < step ? <Check size={12} /> : `0${index + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>
      <label className="visitor-frame-label" htmlFor="visitor-photostrip-frame">
        your AIBox photostrip
      </label>
      <select
        id="visitor-photostrip-frame"
        value={session.frameId}
        disabled={busy}
        onChange={(event) => onFrameChange(event.target.value)}
      >
        {captureFrames.map((frame) => (
          <option key={frame.id} value={frame.id}>
            {frame.name}
          </option>
        ))}
      </select>
      <p className="visitor-frame-note">Four new camera photos. Changing the frame starts a new session.</p>
      <div className="visitor-shot-progress">
        <span>
          your photos{" "}
          <strong>
            {session.shotCount} / {STRIP_SHOT_COUNT}
          </strong>
        </span>
        <progress
          value={session.shotCount}
          max={STRIP_SHOT_COUNT}
          aria-label="Photos taken for your photostrip"
        />
      </div>
      <p className="photo-task-status" role="status">
        {status === "ready"
          ? instruction
          : "Loading your 3D booth. You can enable the camera while you wait."}
      </p>
      {session.error && (
        <p className="playground-error" role="alert">
          {session.error}
        </p>
      )}
      {!cameraActive ? (
        <button
          type="button"
          className="button button-primary guest-task-button"
          onClick={onEnableCamera}
          disabled={cameraMode === "requesting"}
        >
          <Camera size={14} aria-hidden="true" />
          {cameraMode === "requesting" ? "Choose Allow in your browser…" : "1. Enable my camera"}
        </button>
      ) : task.phase === "idle" ? (
        <button
          type="button"
          className="button profile-button-ink guest-task-button"
          onClick={onSend}
          disabled={status !== "ready"}
        >
          <Send size={14} aria-hidden="true" />
          2. Go to photo spot
        </button>
      ) : complete ? (
        <>
          <a className="profile-text-link" href="#playground-photo-preview">
            View my photostrip ↗
          </a>
          <button type="button" className="button profile-button-ink guest-task-button" onClick={onReset}>
            Start a new photostrip
          </button>
        </>
      ) : (
        <div className="visitor-peace-cue" data-detecting={peaceProgress > 0}>
          <Hand size={18} aria-hidden="true" />
          <span>
            {task.phase === "walking"
              ? "Walking to the booth…"
              : task.phase === "processing"
                ? "Preparing your print…"
                : task.phase === "countdown"
                  ? "Hold your peace sign…"
                  : "Hold ✌ to take your next photo"}
          </span>
          <progress value={peaceProgress} max={1} aria-label="Peace sign hold progress" />
        </div>
      )}
      {task.phase !== "idle" && !complete && (
        <button className="guest-task-cancel" type="button" onClick={onReset}>
          Cancel session / explore again
        </button>
      )}
    </div>
  );
}
