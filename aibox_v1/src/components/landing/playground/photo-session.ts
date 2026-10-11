import type { AnimatedGuests } from "./animated-guests";
import { EMPTY_PHOTO_TASK, type PhotoTask } from "./playground-types";

/** A small photo flow with explicit transitions; React receives changes, not frames. */
export function createPhotoSession(
  guests: AnimatedGuests,
  onTask: (task: PhotoTask) => void,
  capture: (guest: number) => void,
) {
  let task: PhotoTask = { ...EMPTY_PHOTO_TASK };
  let elapsed = 0;

  function transition(next: PhotoTask) {
    task = next;
    onTask({ ...next });
  }

  return {
    get task() {
      return task;
    },
    send(guest: number) {
      if (task.phase === "walking" || task.phase === "countdown") return;
      guests.sendToBooth(guest);
      transition({ phase: "walking", guest, countdown: null });
    },
    capture() {
      if (!["posing", "captured", "error"].includes(task.phase) || !guests.hasArrived()) return;
      elapsed = 0;
      transition({ ...task, phase: "countdown", countdown: 3 });
    },
    cancel() {
      guests.release();
      elapsed = 0;
      transition({ ...EMPTY_PHOTO_TASK });
    },
    update(delta: number) {
      if (task.phase === "walking" && guests.hasArrived()) {
        transition({ ...task, phase: "posing" });
      }
      if (task.phase !== "countdown") return;
      elapsed += delta;
      const countdown = Math.max(0, Math.ceil(3 - elapsed));
      if (countdown > 0) {
        if (countdown !== task.countdown) transition({ ...task, countdown });
        return;
      }
      try {
        capture(task.guest);
        transition({ ...task, phase: "captured", countdown: null });
      } catch {
        transition({ ...task, phase: "error", countdown: null });
      }
    },
  };
}

export type PhotoSession = ReturnType<typeof createPhotoSession>;
