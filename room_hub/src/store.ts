import fs from "node:fs";
import path from "node:path";
import type { AiStyle, GameId, OrderStatus, PackageId, RoomFrameId, RoomKind, RoomStatus } from "./protocol.js";
import { log } from "./util.js";

export type DeviceRec = { name: string; slot: number; joinedAt: number; lastSeen: number };
export type RoomRec = {
  id: string; kind: RoomKind; status: RoomStatus; packageId: PackageId | null; frameId: RoomFrameId | null;
  gameId: GameId | null; maxDevices: number; joinCode: string; hostKeyHash: string; hostDeviceId: string | null;
  orderId: string | null; aiCredits: number; devices: Record<string, DeviceRec>;
  createdAt: number; openedAt: number; completedAt: number | null; expiresAt: number | null; resultId: string | null;
};
export type OrderRec = {
  id: string; kind: "room" | "ai_addon"; packageId: PackageId | null; frameId: RoomFrameId | null;
  resultId: string | null; amount: number; status: OrderStatus; createdAt: number; expiresAt: number;
  paidAt: number | null; roomId: string | null; tripayRef: string | null; qrString: string; mock: boolean;
};
export type ResultRec = {
  id: string; roomId: string; frameId: RoomFrameId; createdAt: number; deleteAt: number;
  finalKey: string; thumbKey: string; stills: { round: number; slot: number; key: string }[];
  variants: { id: string; style: AiStyle; key: string; createdAt: number }[];
};
export type AiJobRec = {
  id: string; resultId: string; roomId: string; style: AiStyle; inputKey: string; outputKey: string;
  status: "queued" | "running" | "done" | "failed"; error: string | null; mock: boolean; createdAt: number;
  refunded: boolean; falRequestId?: string; falStatusUrl?: string; falResponseUrl?: string;
  falSubmittedAt?: number; lastPollAt?: number;
};
export type CreditNote = { code: string; roomId: string; orderId: string | null; at: number; note: string };

type Dump = {
  orders: OrderRec[]; rooms: RoomRec[]; results: ResultRec[]; aiJobs: AiJobRec[]; creditNotes: CreditNote[];
};

export class Store {
  orders = new Map<string, OrderRec>();
  rooms = new Map<string, RoomRec>();
  results = new Map<string, ResultRec>();
  aiJobs = new Map<string, AiJobRec>();
  /** joinCode -> roomId (rebuilt on load) */
  codes = new Map<string, string>();
  creditNotes: CreditNote[] = [];

  private file: string;
  private timer: NodeJS.Timeout | null = null;
  private writing: Promise<void> = Promise.resolve();
  private dirty = false;

  constructor(dataDir: string, private debounceMs = 250) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.file = path.join(dataDir, "db.json");
  }

  load(): void {
    if (!fs.existsSync(this.file)) return;
    try {
      const d = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<Dump>;
      for (const o of d.orders ?? []) this.orders.set(o.id, o);
      for (const r of d.rooms ?? []) {
        this.rooms.set(r.id, r);
        this.codes.set(r.joinCode, r.id);
      }
      for (const r of d.results ?? []) this.results.set(r.id, r);
      for (const j of d.aiJobs ?? []) this.aiJobs.set(j.id, j);
      this.creditNotes = d.creditNotes ?? [];
      log(`store: loaded ${this.rooms.size} rooms, ${this.orders.size} orders, ${this.results.size} results`);
    } catch (e) {
      console.error("store: failed to load db.json", e);
      try { fs.copyFileSync(this.file, this.file + ".corrupt-" + Date.now()); } catch { /* ignore */ }
    }
  }

  /** Mark dirty; the write is debounced. */
  save(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
    this.timer.unref?.();
  }

  flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.writing = this.writing.then(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      const dump: Dump = {
        orders: [...this.orders.values()], rooms: [...this.rooms.values()], results: [...this.results.values()],
        aiJobs: [...this.aiJobs.values()], creditNotes: this.creditNotes,
      };
      const tmp = this.file + ".tmp";
      try {
        await fs.promises.writeFile(tmp, JSON.stringify(dump));
        await fs.promises.rename(tmp, this.file);
      } catch (e) {
        console.error("store: write failed", e);
        this.dirty = true;
      }
    });
    return this.writing;
  }
}
