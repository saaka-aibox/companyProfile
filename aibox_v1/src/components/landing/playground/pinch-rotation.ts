import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type BoothPose = { x: number; y: number };
type PinchAnchor = { handX: number; handY: number; pose: BoothPose };

const CLOSE_RATIO = .3;
const RELEASE_RATIO = .46;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Landmark-based pinch, independent of the recognizer's named gesture labels. */
export function createPinchRotation() {
  let anchor: PinchAnchor | null = null;

  return {
    reset() { anchor = null; },
    update(landmarks: NormalizedLandmark[] | undefined, pose: BoothPose, aspect = 4 / 3) {
      const thumb = landmarks?.[4], index = landmarks?.[8];
      const wrist = landmarks?.[0], middleKnuckle = landmarks?.[9];
      if (!thumb || !index || !wrist || !middleKnuckle) {
        anchor = null;
        return { pinching: false, point: null, pose: null };
      }
      const distance = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
      const palmSize = distance(wrist, middleKnuckle);
      const ratio = distance(thumb, index) / Math.max(palmSize, .025);
      const point = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
      // Hysteresis keeps small tracking variations from repeatedly dropping the grip.
      const pinching = ratio < (anchor ? RELEASE_RATIO : CLOSE_RATIO);
      if (!pinching) { anchor = null; return { pinching: false, point, pose: null }; }
      if (!anchor) anchor = { handX: point.x, handY: point.y, pose: { ...pose } };
      return {
        pinching: true,
        point,
        pose: {
          // Mirror horizontal movement to match the camera preview. Release to regrip.
          x: anchor.pose.x + (anchor.handX - point.x) * 240,
          y: clamp(anchor.pose.y + (anchor.handY - point.y) * 100, -25, 25),
        },
      };
    },
  };
}
