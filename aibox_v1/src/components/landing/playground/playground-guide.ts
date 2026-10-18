import type { CameraMode } from "../useGestureCamera";
import type { BoothKind, PhotoTask } from "./playground-types";

export function playgroundGuide(
  kind: BoothKind,
  task: PhotoTask,
  mode: CameraMode,
  detected: boolean,
  pinching: boolean,
  hasExplored: boolean,
  visitor = false,
  shots = 0,
) {
  if (kind === "fixed")
    return {
      step: "01 / coming soon",
      title: "A permanent place for a moment.",
      copy: "Our fixed booth is in development. Explore its concept volume, or choose Portable to try a photo session.",
    };
  if (visitor) {
    if (task.phase === "captured")
      return {
        step: "04 / keep",
        title: "Your own little keepsake.",
        copy: "Four camera photos, in your selected AIBox photostrip. Enlarge or download it below. Start a new photostrip to explore again.",
      };
    if (task.phase === "processing")
      return {
        step: "03 / saving",
        title: "Making your photostrip.",
        copy: "Your photos are being placed in the AIBox frame, here in your browser.",
      };
    if (task.phase === "countdown")
      return {
        step: "03 / camera",
        title: `Photo ${Math.min(shots + 1, 4)} of 4. Hold that peace sign.`,
        copy: "Keep your face and peace sign visible in the camera preview until the shutter. Your webcam supplies the photo.",
      };
    if (mode === "idle" || mode === "error" || mode === "requesting")
      return {
        step: "01 / camera",
        title: "Guest 06 is you.",
        copy:
          mode === "requesting"
            ? "Choose Allow in your browser's camera prompt. Your webcam is shared with the preview and your 3D avatar."
            : "Choose Enable my camera and allow access. Your camera will appear above Guest 06, ready for hand control and your own photos.",
      };
    if (mode === "loading" || mode === "preview")
      return {
        step: "01 / hand control",
        title: mode === "preview" ? "Let's reconnect your hand." : "Your camera is live.",
        copy:
          mode === "preview"
            ? "Choose Retry hand control below. A detected peace sign is needed to take your photos."
            : "Hand control is loading. You can drag or use arrow keys to move your avatar while you wait.",
      };
    if (task.phase === "walking")
      return {
        step: "02 / approach",
        title: "You're on your way.",
        copy: "Your avatar is walking to the photo spot. Get your face and hand into the camera preview.",
      };
    if (task.phase === "posing" || task.phase === "error")
      return {
        step: "03 / peace",
        title: shots ? `${shots} of 4. Make another moment.` : "Your turn in front of the lens.",
        copy: shots
          ? "Lower your hand between shots, then hold a new peace sign. Keep it visible throughout the three-second countdown."
          : "Hold a peace sign for a moment to start the countdown. Keep it visible until the shutter. Repeat for four photos.",
      };
    return {
      step: "02 / explore",
      title: pinching ? "You're moving through the venue." : "A little world, with you in it.",
      copy: "Choose Move You, pinch thumb and index finger, and move your hand to walk. Then choose Go to photo spot, or give a thumbs up. Orbit scene lets you look around.",
    };
  }
  if (task.phase === "walking")
    return {
      step: "02 / approach",
      title: "Here comes your guest.",
      copy: "They'll walk to the marked spot and face the booth. You can keep exploring the venue while they move.",
    };
  if (task.phase === "posing")
    return {
      step: "03 / capture",
      title: "Ready when you are.",
      copy: "Choose Take photo to start a three-second countdown. With hand control enabled, a victory sign does the same.",
    };
  if (task.phase === "countdown")
    return {
      step: "03 / countdown",
      title: "Hold that pose.",
      copy: "The virtual booth is about to capture this guest. Your framed portrait will appear below.",
    };
  if (task.phase === "captured")
    return {
      step: "04 / keep",
      title: "That's a keeper.",
      copy: "Enlarge or download the photo below. Retake it, or let your guest rejoin the event and invite someone else.",
    };
  if (task.phase === "error")
    return {
      step: "03 / retry",
      title: "Let's try that again.",
      copy: "The portrait couldn't be captured. Choose Take photo to retry, or cancel and send another guest.",
    };
  if (mode === "requesting")
    return {
      step: "01 / camera",
      title: "Allow your camera.",
      copy: "Choose Allow in your browser prompt to enable optional hand control.",
    };
  if (mode === "loading")
    return {
      step: "01 / camera",
      title: "Your camera is live.",
      copy: "Hand control is getting ready. Guest photo tasks work with the controls at any time.",
    };
  if (mode === "ready" && pinching)
    return {
      step: "01 / explore",
      title: "You've got it.",
      copy: "Move your pinched hand to explore. Your selected view mode controls whether you orbit, pan, or turn the portable box.",
    };
  if (mode === "ready" && detected)
    return {
      step: "01 / gesture",
      title: "A little gesture goes a long way.",
      copy: "Pinch to explore. Thumbs up sends your selected guest to the booth. Once they arrive, a victory sign takes their photo.",
    };
  return {
    step: "01 / explore",
    title: hasExplored ? "Now, direct a moment." : "Make yourself at home.",
    copy: "Orbit or pan around the venue. Select a guest and choose Send to booth to try a photo session. Home resets the view.",
  };
}
