import type { GameId } from "../catalog";
import type { EngineFactory } from "../engine";

/** Engines are loaded on demand so the hub stays light. */
export async function loadEngine(id: GameId): Promise<EngineFactory> {
  switch (id) {
    case "suit-arena":
      return (await import("./suit-arena")).createSuitArena;
    case "irisan-buah":
      return (await import("./irisan-buah")).createIrisanBuah;
    case "kode-komando":
      return (await import("./kode-komando")).createKodeKomando;
    case "tepuk-sinkron":
      return (await import("./tepuk-sinkron")).createTepukSinkron;
  }
}
