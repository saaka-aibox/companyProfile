import { COLORS, PLAYER_COLORS, bannerText, drawCoverFull, emoji, panel, pill, text } from "../draw";
import { H, W, type Engine, type EngineEnv, type Hud } from "../engine";
import type { GestureName } from "../hand-input";
import { randomSalt, sha256Hex } from "../util";

export type Choice = "rock" | "paper" | "scissors" | "none";
const VALID: Choice[] = ["rock", "paper", "scissors"];
const GLYPH: Record<Choice, string> = { rock: "✊", paper: "✋", scissors: "✌️", none: "?" };
const NAME: Record<Choice, string> = { rock: "BATU", paper: "KERTAS", scissors: "GUNTING", none: "NO SIGN" };
const BEATS: Record<string, Choice> = { rock: "scissors", scissors: "paper", paper: "rock" };

/** 1 when a beats b, -1 when b beats a, 0 on a tie. A missing sign loses to any sign. */
export function versus(a: Choice, b: Choice): 1 | 0 | -1 {
  if (a === b) return 0;
  if (a === "none") return -1;
  if (b === "none") return 1;
  return BEATS[a] === b ? 1 : -1;
}

export function gestureToChoice(g: GestureName): Choice | null {
  if (g === "Closed_Fist") return "rock";
  if (g === "Open_Palm") return "paper";
  if (g === "Victory") return "scissors";
  return null;
}

// Per-round schedule (ms from the round start). Both devices derive these from the same startAt.
const ROUND_MS = 6800;
const LEAD_IN = 1800;
const CUE = 2400; // "SUIT!"
const WINDOW = 200; // +-200 ms majority-vote window
const RESOLVE = 3400;
const SHOW_MS = 2800;
const SUDDEN_AFTER = 3;

type Round = {
  samples: Choice[][];
  chosen: boolean;
  mine: Choice;
  salt: string;
  hash: string;
  committed: boolean;
  revealed: boolean;
  resolved: boolean;
  result: [Choice, Choice];
  verdict: 1 | 0 | -1;
  freeze: HTMLCanvasElement | null;
  resolvedAt: number;
};

export function createSuitArena(env: EngineEnv): Engine {
  const net = env.net;
  const remote = env.setup.where === "remote" && !!net;
  const pvp = !remote && env.setup.variant === "pvp";
  const localPlayers = pvp ? 2 : 1;
  const names: [string, string] = remote
    ? [net!.name || "You", "Opponent"]
    : pvp ? ["Player 1", "Player 2"] : ["You", "CPU"];
  const base = env.startAt + LEAD_IN;
  const scores: [number, number] = [0, 0];
  const rounds: Round[] = [];
  let oppId: string | null = null;
  let finished = false;
  let finishAt = 0;
  let decidedWinner: 0 | 1 | null = null;
  let manual: Choice | null = null;
  let manualRound = -1;
  let flashAt = 0;
  let lastMomentFreeze: HTMLCanvasElement | null = null;

  const round = (r: number): Round =>
    (rounds[r] ??= {
      samples: [[], []], chosen: false, mine: "none", salt: randomSalt(), hash: "", committed: false,
      revealed: false, resolved: false, result: ["none", "none"], verdict: 0, freeze: null, resolvedAt: 0,
    });

  const timing = () => {
    const rel = env.clock.now() - base;
    if (rel < 0) return { r: -1, t: rel };
    const r = Math.floor(rel / ROUND_MS);
    return { r, t: rel - r * ROUND_MS };
  };

  // Sample the gestures inside the cue window.
  const offFrame = env.tracker.onFrame((f) => {
    const { r, t } = timing();
    if (r < 0 || t < CUE - WINDOW || t > CUE + WINDOW) return;
    const st = round(r);
    for (let p = 0; p < localPlayers; p++) {
      const hand = f.players[p];
      if (!hand?.present) continue;
      const c = gestureToChoice(hand.raw);
      if (c) st.samples[p].push(c);
    }
  });

  function majority(samples: Choice[]): Choice {
    if (samples.length < 2) return "none";
    const counts = new Map<Choice, number>();
    for (const s of samples) counts.set(s, (counts.get(s) ?? 0) + 1);
    let best: Choice = "none";
    let n = 0;
    for (const [c, k] of counts) if (k > n) { best = c; n = k; }
    return best;
  }

  function findOpp() {
    if (!net) return;
    oppId ??= net.peers.find((p) => p.id !== net.you)?.id ?? null;
    if (oppId) names[1] = net.peerName(oppId);
  }

  function resolve(r: number, st: Round, now: number) {
    let left: Choice;
    let right: Choice;
    if (remote) {
      left = st.mine;
      const rev = oppId ? net!.reveals.get(oppId)?.get(r) : undefined;
      right = rev && rev.valid && (VALID as string[]).includes(rev.choice) ? (rev.choice as Choice) : "none";
    } else if (pvp) {
      left = majority(st.samples[0]);
      right = majority(st.samples[1]);
    } else {
      left = st.mine;
      right = VALID[Math.floor(Math.random() * 3)];
    }
    st.result = [left, right];
    st.verdict = versus(left, right);
    st.resolved = true;
    st.resolvedAt = now;
    if (st.verdict === 1) scores[0]++;
    else if (st.verdict === -1) scores[1]++;
    flashAt = performance.now();
    st.freeze = env.moments?.captureFull() ?? null;
    if (st.freeze) lastMomentFreeze = st.freeze;
    const played = rounds.filter((x) => x?.resolved).length;
    const decided = scores[0] >= 2 || scores[1] >= 2 || (played >= SUDDEN_AFTER && scores[0] !== scores[1]);
    if (decided) {
      decidedWinner = scores[0] > scores[1] ? 0 : 1;
      finishAt = now + SHOW_MS;
    }
  }

  function conclude(opponentLeft = false) {
    if (finished) return;
    finished = true;
    const winner = opponentLeft ? 0 : decidedWinner ?? (scores[0] >= scores[1] ? 0 : 1);
    const iWon = winner === 0;
    const played = rounds.filter((x) => x?.resolved).length;
    const photo = lastMomentFreeze ?? env.moments?.captureFull() ?? null;
    const stamp = pvp
      ? { text: winner === 0 ? "P1 WINS" : "P2 WINS", tone: "gold" as const }
      : { text: iWon ? "WIN" : "LOSE", tone: iWon ? ("win" as const) : ("lose" as const) };
    env.finish({
      outcome: pvp ? "done" : iWon ? "win" : "lose",
      title: opponentLeft ? "Your opponent left" : pvp ? `${names[winner]} takes the arena` : iWon ? "You rule the arena" : `${names[1]} takes this one`,
      subtitle: opponentLeft
        ? "The match ended early, so the win goes to you."
        : `Final score ${scores[0]} - ${scores[1]} after ${played} round${played === 1 ? "" : "s"}${played > SUDDEN_AFTER ? " (sudden death)" : ""}.`,
      stamp,
      stats: [
        { label: "Score", value: `${scores[0]}-${scores[1]}` },
        { label: "Rounds", value: String(played) },
        { label: "Mode", value: remote ? "Online 1v1" : pvp ? "2 players" : "vs CPU" },
      ],
      photo,
      burst: env.moments?.recent() ?? [],
    });
  }

  function update() {
    if (finished) return;
    const now = env.clock.now();
    findOpp();
    if (remote && timing().r >= 0 && oppId && !net!.peers.find((p) => p.id === oppId)?.connected && decidedWinner === null) {
      conclude(true);
      return;
    }
    if (finishAt && now >= finishAt) {
      conclude();
      return;
    }
    const { r, t } = timing();
    if (r < 0) return;
    // Settle any earlier round we skipped (tab hidden on a remote game).
    for (let k = 0; k < r; k++) {
      const old = round(k);
      if (!old.chosen) { old.chosen = true; old.mine = majority(old.samples[0]); }
      if (!old.resolved && decidedWinner === null) resolve(k, old, now);
    }
    if (decidedWinner !== null) return;
    const st = round(r);
    if (!st.chosen && t >= CUE + WINDOW) {
      st.chosen = true;
      st.mine = manualRound === r && manual ? manual : majority(st.samples[0]);
      if (remote) {
        const choice = st.mine;
        sha256Hex(`${choice}:${st.salt}`).then((hash) => {
          st.hash = hash;
          net!.commit(r, hash);
          st.committed = true;
        });
      }
    }
    if (remote && st.committed && !st.revealed) {
      const theirCommit = oppId ? net!.commits.get(oppId)?.has(r) : false;
      if (theirCommit || t >= CUE + 900) {
        st.revealed = true;
        net!.reveal(r, st.mine, st.salt);
      }
    }
    if (!st.resolved && t >= RESOLVE) {
      if (!remote) {
        resolve(r, st, now);
      } else {
        const rev = oppId ? net!.reveals.get(oppId)?.get(r) : undefined;
        if ((rev && st.revealed) || t >= RESOLVE + 1500) resolve(r, st, now);
      }
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    const { r, t } = timing();
    const st = r >= 0 ? rounds[r] : undefined;
    const showing = !!st?.resolved && !finished;

    if (showing && st!.freeze) {
      drawCoverFull(g, st!.freeze, true);
      g.fillStyle = "rgba(14,17,22,.45)";
      g.fillRect(0, 0, W, H);
    } else {
      g.fillStyle = "rgba(14,17,22,.28)";
      g.fillRect(0, 0, W, H);
    }
    if (pvp) {
      g.strokeStyle = "rgba(255,255,255,.35)";
      g.setLineDash([10, 10]);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(W / 2, 90); g.lineTo(W / 2, H - 20); g.stroke();
      g.setLineDash([]);
      text(g, names[0].toUpperCase(), W * 0.25, 70, { size: 24, mono: true, weight: 500, align: "center", color: PLAYER_COLORS[0] });
      text(g, names[1].toUpperCase(), W * 0.75, 70, { size: 24, mono: true, weight: 500, align: "center", color: PLAYER_COLORS[1] });
    }

    if (r < 0) {
      bannerText(g, "GET READY", H * 0.3, 80);
      text(g, String(Math.max(1, Math.ceil(-t / 1000))), W / 2, H * 0.55, { size: 160, weight: 700, align: "center", color: COLORS.accent });
      text(g, remote ? "Show your sign when you hear SUIT" : "Make a fist and shake it, then show your sign on SUIT", W / 2, H * 0.72, { size: 26, align: "center", color: COLORS.muted });
    } else if (!showing) {
      const word = t < 800 ? "BATU" : t < 1600 ? "GUNTING" : t < CUE ? "KERTAS" : "SUIT!";
      const onset = t < 800 ? t : t < 1600 ? t - 800 : t < CUE ? t - 1600 : t - CUE;
      const pop = env.reduced ? 1 : 1 + Math.max(0, 1 - onset / 220) * 0.25;
      g.save();
      g.translate(W / 2, H * 0.3);
      g.scale(pop, pop);
      bannerText(g, word, 0, word === "SUIT!" ? 150 : 110, word === "SUIT!" ? COLORS.accent : COLORS.ink);
      g.restore();
      text(g, `ROUND ${Math.min(r + 1, 99)}${r + 1 > SUDDEN_AFTER && scores[0] === scores[1] ? " / SUDDEN DEATH" : ""}`, W / 2, 60, { size: 24, mono: true, weight: 500, align: "center", color: COLORS.blue });
      // live feedback of what the camera currently sees
      for (let p = 0; p < localPlayers; p++) {
        const hand = env.tracker.latest.players[p];
        const c = hand?.present ? gestureToChoice(hand.gesture) : null;
        const x = pvp ? W * (0.25 + 0.5 * p) : W / 2;
        pill(g, c ? `${NAME[c].toLowerCase()} seen` : hand?.present ? "show a sign" : "no hand yet", x, H - 54, c ? COLORS.win : COLORS.muted);
      }
      if (t >= CUE - WINDOW && t <= CUE + WINDOW) {
        g.strokeStyle = COLORS.accent;
        g.lineWidth = 6;
        g.strokeRect(10, 10, W - 20, H - 20);
      }
      if (remote && st?.committed) pill(g, "locked in, waiting for reveal", W / 2, H * 0.52, COLORS.blue);
      // face-down cards while waiting
      if (t >= CUE) {
        card(g, 70, 250, "?", names[0], PLAYER_COLORS[0], false);
        card(g, W - 70 - 300, 250, "?", names[1], PLAYER_COLORS[1], false);
        if (remote && oppId && net!.commits.get(oppId)?.has(r)) pill(g, `${names[1].toLowerCase()} is locked in`, W - 220, 600, COLORS.win);
      }
    } else if (st) {
      const dt = performance.now() - flashAt;
      if (dt < 260 && !env.reduced) {
        g.fillStyle = `rgba(255,255,255,${0.8 * (1 - dt / 260)})`;
        g.fillRect(0, 0, W, H);
      }
      card(g, 70, 230, GLYPH[st.result[0]], NAME[st.result[0]], PLAYER_COLORS[0], st.verdict === 1, names[0]);
      card(g, W - 70 - 300, 230, GLYPH[st.result[1]], NAME[st.result[1]], PLAYER_COLORS[1], st.verdict === -1, names[1]);
      const label = st.verdict === 0 ? "DRAW" : pvp ? `${names[st.verdict === 1 ? 0 : 1].toUpperCase()}` : st.verdict === 1 ? "YOU WIN THE ROUND" : `${names[1].toUpperCase()} TAKES IT`;
      bannerText(g, label, 130, label.length > 12 ? 60 : 96, st.verdict === 1 ? COLORS.win : st.verdict === -1 ? COLORS.lose : COLORS.blue);
      if (decidedWinner !== null) {
        const won = decidedWinner === 0;
        g.save();
        g.translate(W / 2, H - 120);
        g.rotate(-0.08);
        const label2 = pvp ? (won ? "P1 WINS" : "P2 WINS") : won ? "WIN" : "LOSE";
        const col = pvp ? COLORS.accent : won ? COLORS.win : COLORS.lose;
        g.font = `700 110px ${getComputedStyle(document.body).fontFamily}`;
        const tw = g.measureText(label2).width + 80;
        panel(g, -tw / 2, -92, tw, 130, 14, "rgba(14,17,22,.7)", col, 8);
        text(g, label2, 0, 12, { size: 110, weight: 700, align: "center", color: col, shadow: false });
        g.restore();
      } else {
        text(g, `${scores[0]} - ${scores[1]}`, W / 2, H - 70, { size: 64, weight: 700, align: "center" });
      }
    }
  }

  function card(g: CanvasRenderingContext2D, x: number, y: number, glyph: string, label: string, color: string, winner: boolean, who?: string) {
    panel(g, x, y, 300, 330, 20, "rgba(14,17,22,.8)", winner ? COLORS.win : color, winner ? 8 : 3);
    emoji(g, glyph, x + 150, y + 140, 150);
    text(g, label, x + 150, y + 262, { size: 38, weight: 700, align: "center", color: glyph === "?" ? COLORS.muted : COLORS.ink });
    if (who) text(g, who.toUpperCase(), x + 150, y + 306, { size: 20, mono: true, weight: 500, align: "center", color });
  }

  function hud(): Hud {
    const { r } = timing();
    const dis = r < 0 || finished || decidedWinner !== null;
    return {
      players: [
        { name: names[0], score: scores[0], color: PLAYER_COLORS[0], sub: "first to 2" },
        { name: names[1], score: scores[1], color: PLAYER_COLORS[1], sub: remote ? "online" : pvp ? "right side" : "bot" },
      ],
      label: r < 0 ? "Get ready" : `Round ${r + 1}`,
      hint: pvp ? "Player 1 stands on the left, Player 2 on the right." : "Show a sign at the SUIT! cue. Or use the buttons.",
      actions: pvp ? [] : VALID.map((c) => ({ id: c, label: `${GLYPH[c]} ${NAME[c].charAt(0) + NAME[c].slice(1).toLowerCase()}`, disabled: dis })),
    };
  }

  return {
    skeleton: "full",
    update,
    draw,
    hud,
    action(id) {
      if (!(VALID as string[]).includes(id)) return;
      const { r, t } = timing();
      if (r < 0 || t > CUE + WINDOW) return;
      manual = id as Choice;
      manualRound = r;
    },
    destroy() {
      offFrame();
    },
  };
}
