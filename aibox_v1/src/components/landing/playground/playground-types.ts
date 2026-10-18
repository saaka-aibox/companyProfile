import type { BoothPose } from "./pinch-rotation";
import type { VenueId } from "./venue-presets";

export type BoothKind = "portable" | "fixed";
export type InteractionMode = "orbit" | "pan" | "booth" | "guest";
export type ModelStatus = "loading" | "ready" | "error" | "unsupported";
export type PhotoPhase = "idle" | "walking" | "posing" | "countdown" | "processing" | "captured" | "error";
export type PhotoTask = { phase: PhotoPhase; guest: number; countdown: number | null };
export type ScenePhoto = {
  src: string;
  venue: VenueId;
  guest: number;
  source: "camera" | "virtual";
  width: number;
  height: number;
  frameName?: string;
};

export const VISITOR_GUEST = 5;
export type VisitorHand = { detected: boolean; peace: boolean; y: number; updatedAt: number };
export const EMPTY_VISITOR_HAND: VisitorHand = { detected: false, peace: false, y: 0.5, updatedAt: 0 };

/** Only small commands cross between the HTML controls and the lazy 3D renderer. */
export type SceneController = {
  getOrbitPose(): BoothPose;
  orbitTo(pose: BoothPose): void;
  panBy(x: number, y: number): void;
  zoomBy(amount: number): void;
  moveVisitorBy(x: number, z: number): void;
  resetView(): void;
  sendGuest(): void;
  captureGuest(): void;
  cancelTask(): void;
};

export const boothOptions = [
  { id: "portable", name: "Portable", label: "Modular / ready to explore", accent: "#73c9ff" },
  { id: "fixed", name: "Fixed booth", label: "Coming soon", accent: "#9aadc2" },
] as const;

export const EMPTY_PHOTO_TASK: PhotoTask = { phase: "idle", guest: 0, countdown: null };
export function photoTaskBusy(task: PhotoTask) {
  return task.phase === "walking" || task.phase === "countdown" || task.phase === "processing";
}
