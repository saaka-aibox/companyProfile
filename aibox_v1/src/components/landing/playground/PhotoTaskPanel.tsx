import { Camera, Send, UserRound, Users, X } from "lucide-react";
import {
  photoTaskBusy,
  VISITOR_GUEST,
  type BoothKind,
  type ModelStatus,
  type PhotoTask,
  type SceneController,
} from "./playground-types";
import type { ReactNode, RefObject } from "react";

type Props = {
  boothKind: BoothKind;
  count: number;
  selected: number;
  task: PhotoTask;
  status: ModelStatus;
  onSelect: (guest: number) => void;
  controllerRef: RefObject<SceneController | null>;
  children?: ReactNode;
};

export function photoTaskDescription(task: PhotoTask) {
  const guest = `Guest ${String(task.guest + 1).padStart(2, "0")}`;
  switch (task.phase) {
    case "walking":
      return `${guest} is walking to the photo spot.`;
    case "posing":
      return `${guest} is ready. Take their photo.`;
    case "countdown":
      return `Hold that pose. Capturing in ${task.countdown}…`;
    case "captured":
      return "Photo ready. Preview it below the scene.";
    case "processing":
      return "Preparing the photo preview…";
    case "error":
      return "The photo couldn't be captured. Try again.";
    default:
      return "Select a guest, send them to the booth, then take their photo.";
  }
}

export function PhotoTaskPanel({
  boothKind,
  count,
  selected,
  task,
  status,
  onSelect,
  controllerRef,
  children,
}: Props) {
  const fixed = boothKind === "fixed";
  const busy = photoTaskBusy(task);
  const canCapture = ["posing", "captured", "error"].includes(task.phase);
  return (
    <div className="guest-task-panel">
      <span className="control-label">
        <Users size={12} aria-hidden="true" /> direct a moment
      </span>
      <p className="guest-task-intro">
        {fixed
          ? "Photo sessions for the fixed booth are coming soon. Select Portable to try one."
          : "Guest 06 is you. Choose another guest to try a simulated portrait."}
      </p>
      <div className="guest-options" role="group" aria-label="Choose yourself or a virtual guest">
        {Array.from({ length: count }, (_, index) => (
          <button
            type="button"
            key={index}
            disabled={fixed || busy || status !== "ready"}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
          >
            {index === VISITOR_GUEST ? (
              <UserRound size={12} aria-hidden="true" />
            ) : (
              <Users size={12} aria-hidden="true" />
            )}
            <span>
              {index === VISITOR_GUEST ? "Guest 06 · You" : `Guest ${String(index + 1).padStart(2, "0")}`}
            </span>
          </button>
        ))}
      </div>
      {!fixed && selected === VISITOR_GUEST ? (
        children
      ) : (
        <>
          <p className="photo-task-status" role="status">
            {fixed
              ? "Fixed booth / coming soon"
              : status !== "ready"
                ? "The photo flow becomes available when the 3D booth is ready."
                : photoTaskDescription(task)}
          </p>
          {!fixed && task.phase === "captured" && (
            <a className="profile-text-link" href="#playground-photo-preview">
              View your photo
            </a>
          )}
          <button
            type="button"
            className="button profile-button-ink guest-task-button"
            disabled={fixed || busy || status !== "ready"}
            onClick={() =>
              canCapture ? controllerRef.current?.captureGuest() : controllerRef.current?.sendGuest()
            }
          >
            {canCapture ? <Camera size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
            {task.phase === "walking"
              ? "Walking to the booth…"
              : task.phase === "countdown"
                ? "Capturing…"
                : canCapture
                  ? task.phase === "captured"
                    ? "Take another photo"
                    : "Take photo"
                  : "Send to booth"}
          </button>
          {!fixed && task.phase !== "idle" && (
            <button
              type="button"
              className="guest-task-cancel"
              onClick={() => controllerRef.current?.cancelTask()}
            >
              <X size={12} aria-hidden="true" />
              {task.phase === "captured" ? "Let guest rejoin the event" : "Cancel photo task"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
