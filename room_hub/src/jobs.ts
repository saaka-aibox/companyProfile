import type { App } from "./app.js";
import { deleteResultFiles } from "./results.js";
import { log, randId } from "./util.js";

/** One housekeeping pass. Exported so tests can call it directly. */
export async function runJobsOnce(app: App, now = Date.now()): Promise<void> {
  const { store, cfg, storage } = app;
  let changed = false;

  for (const o of store.orders.values()) {
    if (o.status === "UNPAID" && now > o.expiresAt) { o.status = "EXPIRED"; changed = true; }
  }

  for (const room of [...store.rooms.values()]) {
    if (room.kind === "game") {
      if (room.expiresAt && now > room.expiresAt) {
        app.hub?.closeRoom(room.id, 4010, "game room expired");
        store.rooms.delete(room.id);
        store.codes.delete(room.joinCode);
        changed = true;
      }
    } else if ((room.status === "open" || room.status === "in_session") && !room.resultId && now - room.openedAt > cfg.timing.roomOpenTtlMs) {
      room.status = "abandoned";
      app.hub?.closeRoom(room.id, 4011, "room abandoned");
      const code = "CR-" + randId(6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
      store.creditNotes.push({ code, roomId: room.id, orderId: room.orderId, at: now, note: "room abandoned after TTL; 1 room credit owed" });
      log(`room ${room.id} abandoned -> credit note ${code} (order ${room.orderId})`);
      changed = true;
    }
  }

  for (const r of [...store.results.values()]) {
    if (now > r.deleteAt) {
      await deleteResultFiles(app, r.id);
      log(`result ${r.id} expired and deleted`);
      changed = true;
    }
  }

  // Old terminal rooms/orders: forget them after the result TTL so db.json does not grow forever.
  for (const room of [...store.rooms.values()]) {
    if ((room.status === "abandoned" || room.status === "cancelled") && now - room.openedAt > cfg.timing.roomOpenTtlMs + cfg.timing.resultTtlMs) {
      store.rooms.delete(room.id);
      store.codes.delete(room.joinCode);
      await storage.deleteRoomFiles(room.id, []);
      changed = true;
    }
  }
  for (const o of [...store.orders.values()]) {
    if (o.status === "EXPIRED" && now - o.expiresAt > 24 * 3600 * 1000) { store.orders.delete(o.id); changed = true; }
  }

  app.router.limiter.prune();
  if (changed) store.save();
}

export function startJobs(app: App): NodeJS.Timeout {
  const t = setInterval(() => {
    runJobsOnce(app).catch((e) => console.error("jobs error", e));
  }, app.cfg.timing.jobsIntervalMs);
  t.unref?.();
  return t;
}
