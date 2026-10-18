const HOLD_MS = 500;
const RELEASE_MS = 350;

/** A held peace sign fires once. Lower the hand before starting the next shot. */
export function createPeaceTrigger() {
  let heldSince: number | null = null;
  let releasedSince: number | null = null;
  let latched = false;
  return {
    reset() {
      heldSince = releasedSince = null;
      latched = false;
    },
    update(peace: boolean, eligible: boolean, now: number) {
      if (!peace) {
        heldSince = null;
        releasedSince ??= now;
        if (now - releasedSince >= RELEASE_MS) latched = false;
        return { progress: 0, triggered: false };
      }
      releasedSince = null;
      if (!eligible || latched) {
        heldSince = null;
        return { progress: 0, triggered: false };
      }
      heldSince ??= now;
      const progress = Math.min(1, (now - heldSince) / HOLD_MS);
      if (progress < 1) return { progress, triggered: false };
      latched = true;
      heldSince = null;
      return { progress: 1, triggered: true };
    },
  };
}
