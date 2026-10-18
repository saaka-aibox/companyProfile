import { Camera, ChevronDown, Hand } from "lucide-react";
import type { usePlaygroundControls } from "./usePlaygroundControls";

export function PlaygroundCameraControls({
  controls,
  visitorSelected = false,
  countdown = null,
  shotNumber = 1,
  photoAspect,
}: {
  controls: ReturnType<typeof usePlaygroundControls>;
  visitorSelected?: boolean;
  countdown?: number | null;
  shotNumber?: number;
  photoAspect?: number;
}) {
  const {
    videoRef,
    mode,
    error,
    cameraActive,
    cameraAspectRef,
    detected,
    gesture,
    enableCamera,
    disableCamera,
  } = controls;
  const status = {
    idle: "Camera off — mouse and touch still work",
    requesting: "Choose Allow in your browser's camera prompt",
    loading: "Camera on — loading hand control…",
    ready: gesture,
    preview: "Camera on — hand control unavailable",
    error: "Camera unavailable — see the guidance below",
  }[mode];
  return (
    <details className="playground-hand-controls" open={visitorSelected ? true : undefined}>
      <summary>
        <Hand size={14} aria-hidden="true" />
        <span>
          {visitorSelected ? "Your camera & hand control" : "Control with your hand"}
          <small>
            {cameraActive
              ? "camera on / local hand control"
              : visitorSelected
                ? "required for your own photos"
                : "optional / camera access"}
          </small>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="playground-hand-content">
        <div className="camera-window" style={photoAspect ? { aspectRatio: photoAspect } : undefined}>
          <video
            ref={videoRef}
            className={cameraActive ? "gesture-video is-visible" : "gesture-video"}
            autoPlay
            muted
            playsInline
            aria-label="Mirrored camera preview"
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              cameraAspectRef.current = video.videoWidth / Math.max(video.videoHeight, 1);
            }}
          />
          {!cameraActive && (
            <div className="camera-placeholder">
              <Camera size={24} strokeWidth={1.5} aria-hidden="true" />
              <span>{mode === "requesting" ? "Waiting for permission" : "Camera preview"}</span>
              <small>
                {mode === "requesting"
                  ? "Choose Allow in your browser prompt"
                  : "Enable your camera to try hand control"}
              </small>
            </div>
          )}
          <span className={`camera-live ${cameraActive ? "is-on" : ""}`}>
            <i />
            {cameraActive ? "LIVE" : "CAMERA OFF"}
          </span>
          {cameraActive && countdown !== null && (
            <div className="visitor-camera-countdown" role="status">
              <strong>{countdown}</strong>
              <span>photo {shotNumber} / 4 · hold ✌</span>
            </div>
          )}
        </div>
        <div className="gesture-readout">
          <span className="control-label">gesture input</span>
          <div className="gesture-result" role="status">
            <span className={`detection-dot${detected && mode === "ready" ? " is-detected" : ""}`} />
            {status}
          </div>
          <p>
            {visitorSelected
              ? "Move You: pinch + move to walk. Thumbs up: go to the booth. Hold ✌ for each photo, keeping it visible through the countdown. Lower your hand between shots."
              : "Pinch + move: explore / thumbs up: send guest / victory sign: capture when ready."}
          </p>
        </div>
        {error && (
          <p className="playground-error" role="alert">
            {error}
          </p>
        )}
        <div className="playground-actions">
          {cameraActive && (
            <button type="button" className="button button-outline" onClick={disableCamera}>
              Turn off camera
            </button>
          )}
          {mode === "requesting" && (
            <button type="button" className="button button-outline" onClick={disableCamera}>
              Cancel camera request
            </button>
          )}
          {["idle", "error", "preview"].includes(mode) && (!visitorSelected || mode === "preview") && (
            <button type="button" className="button button-primary" onClick={enableCamera}>
              <Camera size={15} aria-hidden="true" />
              {mode === "preview"
                ? "Retry hand control"
                : mode === "error"
                  ? "Try camera again"
                  : "Enable camera"}
            </button>
          )}
        </div>
        <p className="privacy-note">
          Choose Enable camera, then Allow when your browser asks. Video stays in this browser. Microphone
          access is never requested.
        </p>
      </div>
    </details>
  );
}
