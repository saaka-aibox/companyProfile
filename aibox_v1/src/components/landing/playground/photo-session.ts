import type { AnimatedGuests } from "./animated-guests";
import { EMPTY_PHOTO_TASK, type PhotoTask } from "./playground-types";

/** A small photo flow with explicit transitions; React receives changes, not frames. */
export function createPhotoSession(
  guests: AnimatedGuests,
  onTask: (task: PhotoTask) => void,
  capture: (guest: number) => boolean | Promise<boolean>,
) {
  let task: PhotoTask = { ...EMPTY_PHOTO_TASK };
  let elapsed = 0;
  let generation = 0;

  function transition(next: PhotoTask) {
    task = next;
    onTask({ ...next });
  }

  return {
    get task() {
      return task;
    },
    send(guest: number) {
      if (["walking", "countdown", "processing"].includes(task.phase)) return;
      generation += 1;
      guests.sendToBooth(guest);
      transition({ phase: "walking", guest, countdown: null });
    },
    capture() {
      if (!["posing", "captured", "error"].includes(task.phase) || !guests.hasArrived()) return;
      elapsed = 0;
      transition({ ...task, phase: "countdown", countdown: 3 });
    },
    cancel() {
      generation += 1;
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
      const current = generation;
      transition({ ...task, phase: "processing", countdown: null });
      // A camera session needs several peace-triggered shots; a virtual portrait needs one.
      void Promise.resolve()
        .then(() => {
          if (generation !== current) return null;
          return capture(task.guest);
        })
        .then((complete) => {
          if (generation === current && complete !== null) {
            transition({ ...task, phase: complete ? "captured" : "posing", countdown: null });
          }
        })
        .catch(() => {
          if (generation === current) transition({ ...task, phase: "error", countdown: null });
        });
    },
  };
}

export type PhotoSession = ReturnType<typeof createPhotoSession>;
