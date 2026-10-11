import type { CameraMode } from "../useGestureCamera";
import type { BoothKind, PhotoTask } from "./playground-types";

export function playgroundGuide(
  kind: BoothKind,
  task: PhotoTask,
  mode: CameraMode,
  detected: boolean,
  pinching: boolean,
  hasExplored: boolean,
) {
  if (kind === "fixed")
    return {
      step: "01 / coming soon",
      title: "A permanent place for a moment.",
      copy: "Our fixed booth is in development. Explore its concept volume, or choose Portable to try a photo session.",
    };
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
