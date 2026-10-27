import type { HandTracker, PlayerHand } from "./hand-input";
import type { GameSetup } from "./catalog";
import type { GameNet } from "./net";
import type { MomentBuffer, StampTone } from "./photo-moment";
import type { Clock } from "./util";

/** Logical canvas size shared by every game (the stage keeps a 4:3 camera aspect). */
export const W = 960;
export const H = 720;

export type HudPlayer = { name: string; score: string | number; color: string; sub?: string; active?: boolean };
export type Hud = {
  players: HudPlayer[];
  timer?: string;
  label?: string;
  hint?: string;
  actions?: { id: string; label: string; disabled?: boolean; hint?: string }[];
};

export type GameResult = {
  outcome: "win" | "lose" | "draw" | "done";
  title: string;
  subtitle: string;
  stamp?: { text: string; tone: StampTone };
  stats: { label: string; value: string }[];
  /** Not mirrored full-res frame. */
  photo: HTMLCanvasElement | null;
  split?: { left: HTMLCanvasElement; right: HTMLCanvasElement } | null;
  burst: HTMLCanvasElement[];
  drawOverlay?: (g: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void;
  ranking?: { name: string; score: number; me?: boolean }[];
};

export type EngineEnv = {
  tracker: HandTracker;
  moments: MomentBuffer | null;
  net: GameNet | null;
  setup: GameSetup;
  clock: Clock;
  /** Shared random seed (game_state.seed in remote games). */
  seed: number;
  /** Clock time at which the game starts (remote startAt, or a local time soon after mount). */
  startAt: number;
  reduced: boolean;
  /** True when the camera is unavailable and only buttons/pointer work. */
  noCamera: boolean;
  finish: (r: GameResult) => void;
};

export interface Engine {
  /** What the shell draws over the engine: full hand skeletons, only the fingertip, or nothing. */
  skeleton: "full" | "tip" | "none";
  update(): void;
  draw(g: CanvasRenderingContext2D): void;
  hud(): Hud;
  action?(id: string): void;
  /** Pointer in logical canvas coordinates, or null when it leaves. */
  pointer?(p: { x: number; y: number; down: boolean } | null): void;
  destroy(): void;
}

export type EngineFactory = (env: EngineEnv) => Engine;

export function playersOf(env: EngineEnv): PlayerHand[] {
  return env.tracker.latest.players;
}
