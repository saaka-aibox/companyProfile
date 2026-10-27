"use client";

/** Camera + still capture helpers for AI Box Room. Browser only. */

export function cameraErrorMessage(cause: unknown): string {
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

/** Returns a message when the environment cannot use the camera at all. */
export function cameraUnsupportedMessage(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return "Camera access needs HTTPS or localhost. On this computer, use localhost instead of a network IP. For a phone or another device, use an HTTPS address.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera access is unavailable in this browser. Open this page in a current version of Chrome, Edge, Firefox, or Safari.";
  }
  return null;
}

/** One local track used for the P2P preview AND the full-res still. */
export async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (cause) {
      last = cause;
      const name = cause instanceof Error ? cause.name : "";
      // Permission / hardware errors will not be fixed by looser constraints.
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "NotFoundError" || name === "SecurityError") break;
    }
  }
  throw last;
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
}

export function isWeakDevice() {
  return typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
}

export function streamIsLive(stream: MediaStream | null) {
  const track = stream?.getVideoTracks()[0];
  return !!track && track.readyState === "live";
}

/**
 * Freeze the current frame at native size (long side capped), NOT mirrored, JPEG q0.9.
 * The drawImage happens synchronously on call, so calling this exactly at shootAt freezes that instant.
 */
export function grabStillWithSize(video: HTMLVideoElement): Promise<{ blob: Blob; w: number; h: number }> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return Promise.reject(new Error("Camera frame is not ready."));
  const cap = isWeakDevice() ? 1280 : 1920;
  const scale = Math.min(1, cap / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is unavailable."));
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = canvas.height = 0;
        if (blob) resolve({ blob, w, h });
        else reject(new Error("Could not encode the photo."));
      },
      "image/jpeg",
      0.9,
    );
  });
}

export async function grabStill(video: HTMLVideoElement): Promise<Blob> {
  return (await grabStillWithSize(video)).blob;
}

/** Keeps the screen awake; re-acquires after the tab becomes visible again. */
export function holdWakeLock() {
  let sentinel: WakeLockSentinel | null = null;
  let stopped = false;
  const acquire = async () => {
    try {
      if (stopped || document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      sentinel = await navigator.wakeLock.request("screen");
    } catch {
      sentinel = null;
    }
  };
  const onVisible = () => {
    if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
  };
  document.addEventListener("visibilitychange", onVisible);
  void acquire();
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => undefined);
  };
}

/** Cheap capability check for `caps.mp` (WebAssembly + WebGL). The model itself loads lazily later. */
export function mediaPipeLikelySupported() {
  try {
    if (typeof WebAssembly === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
