import { COLORS, PLAYER_COLORS, SYMBOLS, arc, bannerText, drawSymbol, panel, pill, symbolCard, text } from "../draw";
import { H, W, type Engine, type EngineEnv, type Hud } from "../engine";
import { HoldToConfirm, type HandSymbol } from "../hand-input";
import { clamp, mulberry32 } from "../util";

// ---------------------------------------------------------------- quiz content

export type Question = { q: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3 };
/** A = fist, B = open palm, C = victory, D = thumbs up. */
export const QUIZ_SIGNS: HandSymbol[] = ["fist", "palm", "peace", "thumb"];
const LETTERS = ["A", "B", "C", "D"];

export const QUESTIONS: Question[] = [
  { q: "How does an AI Box MagicBooth start a photo without anyone touching a screen?", options: ["A hand gesture", "A foot pedal", "A coin slot", "A remote control"], answer: 0 },
  { q: "How many photos make up a classic photobooth strip?", options: ["Two", "Three", "Four", "Eight"], answer: 2 },
  { q: "Which hand sign is the classic pose in photobooth pictures?", options: ["Closed fist", "Open palm", "Peace sign", "Thumbs down"], answer: 2 },
  { q: "What does an AI-generated frame start from?", options: ["A coin toss", "A text prompt or a chosen style", "A paper template only", "A random barcode"], answer: 1 },
  { q: "How many devices can join one AI Box Room photostrip at most?", options: ["Two", "Three", "Four", "Ten"], answer: 2 },
  { q: "What helps a photobooth picture look sharp and bright?", options: ["Good, even lighting", "Covering the lens", "Moving fast", "Standing in the dark"], answer: 0 },
  { q: "Which keepsake combo does AI Box offer from one moment?", options: ["Print and digital photo", "Only a sticker", "A tin can", "A postcard stamp"], answer: 0 },
  { q: "Which file format is a common choice for sharing photos online?", options: ["TXT", "JPEG", "WAV", "ZIP"], answer: 1 },
];

// ---------------------------------------------------------------- simon

const POOL_EARLY: HandSymbol[] = ["fist", "palm", "peace"];
const POOL_MID: HandSymbol[] = ["fist", "palm", "peace", "thumb", "one"];
const POOL_LATE: HandSymbol[] = ["fist", "palm", "peace", "thumb", "one", "three", "four", "rock"];
const poolFor = (r: number) => (r < 2 ? POOL_EARLY : r < 5 ? POOL_MID : POOL_LATE);
const MAX_ROUNDS = 12;
const HOLD_MS = 500;
const SHOW_STEP = 950;

type Phase = "intro" | "show" | "input" | "result" | "over";
type Sp = {
  alive: boolean;
  lives: number;
  idx: number;
  status: "wait" | "ok" | "fail-wrong" | "fail-time" | "fail-trick" | "done";
  hold: HoldToConfirm;
  holdProgress: number;
  score: number;
  doneAt: number;
  roundsWon: number;
  answer: number; // quiz
  answeredAt: number;
  correct: number;
};

type SimonRound = { seq: HandSymbol[]; trick: boolean; says: boolean };

export function createKodeKomando(env: EngineEnv): Engine {
  const quiz = env.setup.variant === "quiz";
  const n = env.setup.players;
  const rand = mulberry32(env.seed || 1);
  const T0 = env.startAt + 1500;
  const players: Sp[] = Array.from({ length: n }, () => ({
    alive: true, lives: n === 1 ? 3 : 2, idx: 0, status: "wait", hold: new HoldToConfirm(quiz ? 700 : HOLD_MS),
    holdProgress: 0, score: 0, doneAt: 0, roundsWon: 0, answer: -1, answeredAt: 0, correct: 0,
  }));
  let phase: Phase = "intro";
  let phaseAt = T0;
  let phaseStartInput = 0;
  let round = -1;
  let current: SimonRound = { seq: [], trick: false, says: true };
  let inputLimit = 0;
  let finished = false;
  let overAt = 0;
  let winnerIdx: number | null = null;
  let finalPhoto: HTMLCanvasElement | null = null;
  let concludeTimer: ReturnType<typeof setTimeout> | null = null;
  const now = () => env.clock.now();

  function makeRound(r: number): SimonRound {
    const pool = poolFor(r);
    const trick = r >= 2 && r % 3 === 2;
    const len = trick ? 1 : Math.min(6, 1 + Math.floor((r + 1) / 2));
    const seq: HandSymbol[] = [];
    for (let i = 0; i < len; i++) {
      let s: HandSymbol;
      do s = pool[Math.floor(rand() * pool.length)]; while (seq[i - 1] === s);
      seq.push(s);
    }
    return { seq, trick, says: trick ? rand() < 0.5 : true };
  }

  function startRound() {
    round++;
    if (quiz) {
      if (round >= QUESTIONS.length) return end();
      phase = "input";
      phaseAt = now();
      phaseStartInput = phaseAt;
      inputLimit = 12000;
      players.forEach((p) => { p.answer = -1; p.answeredAt = 0; p.hold.reset(); p.holdProgress = 0; p.status = "wait"; });
      return;
    }
    if (round >= MAX_ROUNDS) return end();
    current = makeRound(round);
    phase = "show";
    phaseAt = now();
    players.forEach((p) => { p.idx = 0; p.status = "wait"; p.hold.reset(); p.holdProgress = 0; p.doneAt = 0; });
  }

  function beginInput() {
    phase = "input";
    phaseAt = now();
    phaseStartInput = phaseAt;
    const L = current.seq.length;
    inputLimit = current.trick ? (current.says ? 4000 : 3200) : 2800 + L * 2300;
    players.forEach((p) => p.hold.reset());
  }

  function resolveSimon() {
    phase = "result";
    phaseAt = now();
    const L = current.seq.length;
    const avoid = current.trick && !current.says;
    players.forEach((p) => {
      if (!p.alive) return;
      let ok: boolean;
      if (avoid) {
        ok = p.status !== "fail-trick";
        if (ok) p.status = "ok";
      } else {
        ok = p.status === "done";
        if (p.status === "wait" || p.status === "ok") p.status = "fail-time";
      }
      if (ok) {
        p.roundsWon++;
        const speed = p.doneAt ? clamp(1 - (p.doneAt - phaseStartInput) / inputLimit, 0, 1) : 0.4;
        p.score += Math.round(10 * L + 20 * speed);
      } else {
        p.lives--;
        if (p.lives <= 0) p.alive = false;
      }
    });
    const alive = players.filter((p) => p.alive).length;
    if (n === 1 ? alive === 0 : alive <= 1) overAt = now() + 2300;
  }

  function resolveQuiz() {
    phase = "result";
    phaseAt = now();
    const q = QUESTIONS[round];
    players.forEach((p) => {
      if (p.answer === q.answer) {
        p.correct++;
        const left = clamp(1 - (p.answeredAt - phaseStartInput) / inputLimit, 0, 1);
        p.score += 100 + Math.round(60 * left);
      }
    });
  }

  function end() {
    if (phase === "over") return;
    phase = "over";
    phaseAt = now();
    finalPhoto = env.moments?.captureFull() ?? null;
    if (n === 2) {
      const alive = players.map((p, i) => ({ p, i })).filter((x) => x.p.alive);
      winnerIdx = quiz || alive.length !== 1
        ? (players[0].score === players[1].score ? null : players[0].score > players[1].score ? 0 : 1)
        : alive[0].i;
    }
    concludeTimer = setTimeout(() => conclude(), env.reduced ? 400 : 1200);
  }

  function conclude() {
    if (finished) return;
    finished = true;
    const p0 = players[0];
    const subtitle = quiz
      ? n === 1
        ? `${p0.correct} of ${QUESTIONS.length} answers correct.`
        : `Player 1 got ${players[0].correct}, Player 2 got ${players[1].correct} of ${QUESTIONS.length}.`
      : n === 1
        ? `You followed the Commander for ${p0.roundsWon} round${p0.roundsWon === 1 ? "" : "s"}.`
        : winnerIdx === null ? "Both players matched each other." : `Player ${winnerIdx + 1} outlasted the Commander's tricks.`;
    const stamp = n === 1
      ? { text: quiz ? `${p0.correct}/${QUESTIONS.length}` : `ROUND ${Math.max(1, round)}`, tone: "gold" as const }
      : { text: winnerIdx === null ? "TIE" : `P${winnerIdx + 1} WINS`, tone: winnerIdx === null ? ("draw" as const) : ("gold" as const) };
    env.finish({
      outcome: n === 1 ? "done" : winnerIdx === null ? "draw" : "done",
      title: quiz
        ? (n === 1 ? "Quiz complete" : winnerIdx === null ? "A tie on the quiz" : `Player ${winnerIdx + 1} is the quiz champion`)
        : n === 1 ? "Commander dismissed" : winnerIdx === null ? "Everyone fell together" : `Player ${winnerIdx + 1} is the last one standing`,
      subtitle,
      stamp,
      stats: [
        { label: n === 1 ? "Score" : "P1 score", value: String(p0.score) },
        ...(n === 2 ? [{ label: "P2 score", value: String(players[1].score) }] : []),
        { label: quiz ? "Questions" : "Rounds", value: String(quiz ? QUESTIONS.length : Math.max(0, round)) },
        { label: "Mode", value: quiz ? "Kuis Isyarat" : "Simon Says" },
      ],
      photo: finalPhoto,
      burst: env.moments?.recent() ?? [],
      drawOverlay: (g, rect) => podium(g, rect, players.map((p) => p.score), winnerIdx),
    });
  }

  function update() {
    if (finished) return;
    const t = now();
    const hands = env.tracker.latest.players;
    if (phase === "intro") {
      if (t >= T0) startRound();
      return;
    }
    if (phase === "show") {
      if (t - phaseAt >= 1200 + current.seq.length * SHOW_STEP) beginInput();
      return;
    }
    if (phase === "input") {
      const since = t - phaseAt;
      if (quiz) {
        let answered = 0;
        players.forEach((p, i) => {
          if (p.answer >= 0) { answered++; return; }
          const h = hands[i];
          const sym = h?.present ? h.symbol : null;
          const r = p.hold.update(sym && QUIZ_SIGNS.includes(sym) ? sym : null, t);
          p.holdProgress = r.progress;
          if (r.locked && r.value) {
            p.answer = QUIZ_SIGNS.indexOf(r.value as HandSymbol);
            p.answeredAt = t;
            answered++;
          }
        });
        if (answered === n || since >= inputLimit) resolveQuiz();
        return;
      }
      const avoid = current.trick && !current.says;
      players.forEach((p, i) => {
        if (!p.alive || p.status === "done" || p.status.startsWith("fail")) return;
        const h = hands[i];
        const sym = h?.present ? h.symbol : "none";
        const expected = avoid ? current.seq[0] : current.seq[p.idx];
        const graceOver = since > 700;
        if (!graceOver && sym !== expected) p.hold.reset();
        const r = p.hold.update(graceOver || sym === expected ? sym : null, t);
        p.holdProgress = r.progress;
        if (!r.locked || !r.value) return;
        if (avoid) {
          if (r.value === expected) p.status = "fail-trick";
          return;
        }
        if (r.value === expected) {
          p.idx++;
          p.holdProgress = 0;
          if (p.idx >= current.seq.length) { p.status = "done"; p.doneAt = t; } else { p.status = "ok"; }
        } else {
          p.status = "fail-wrong";
        }
      });
      const live = players.filter((p) => p.alive);
      const settled = avoid
        ? live.every((p) => p.status === "fail-trick")
        : live.every((p) => p.status === "done" || p.status.startsWith("fail"));
      if (settled || since >= inputLimit) resolveSimon();
      return;
    }
    if (phase === "result") {
      if (overAt && t >= overAt) return end();
      if (t - phaseAt >= (quiz ? 2600 : 2300)) startRound();
    }
  }

  function wrap(g: CanvasRenderingContext2D, s: string, maxW: number): string[] {
    const words = s.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  const zone = (i: number) => {
    const zw = W / n;
    return { x: i * zw, w: zw, cx: i * zw + zw / 2 };
  };

  function drawDetected(g: CanvasRenderingContext2D) {
    players.forEach((p, i) => {
      const h = env.tracker.latest.players[i];
      const z = zone(i);
      const color = n === 2 ? PLAYER_COLORS[i] : COLORS.blue;
      if (!p.alive) { pill(g, "out", z.cx, H - 46, COLORS.lose); return; }
      const s = h?.present ? h.symbol : "none";
      pill(g, h?.present ? (s === "none" ? "hold a clear sign" : `${SYMBOLS[s].label.toLowerCase()} seen`) : "no hand yet", z.cx, H - 46, s !== "none" ? color : COLORS.muted);
    });
  }

  function drawSimon(g: CanvasRenderingContext2D) {
    const t = now();
    if (n === 2) {
      g.strokeStyle = "rgba(255,255,255,.35)";
      g.setLineDash([10, 10]);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(W / 2, 250); g.lineTo(W / 2, H - 20); g.stroke();
      g.setLineDash([]);
    }
    if (phase === "intro") {
      bannerText(g, "KODE KOMANDO", H * 0.3, 84);
      text(g, String(Math.max(1, Math.ceil((T0 - t) / 1000))), W / 2, H * 0.55, { size: 160, weight: 700, align: "center", color: COLORS.accent });
      text(g, "Copy the Commander's signs. Hold each one for half a second.", W / 2, H * 0.7, { size: 26, align: "center", color: COLORS.muted });
      return;
    }
    const L = current.seq.length;
    const says = current.says;
    if (phase === "show" || phase === "input") {
      const header = current.trick && !says ? "NO ORDER GIVEN" : "COMMANDER SAYS...";
      panel(g, W / 2 - 250, 22, 500, 74, 37, "rgba(14,17,22,.8)", says ? COLORS.accent : COLORS.lose, 4);
      text(g, header, W / 2, 72, { size: 40, weight: 700, align: "center", color: says ? COLORS.accent : COLORS.lose, shadow: false });
    }
    text(g, `ROUND ${round + 1}${current.trick ? "  /  TRICK" : ""}`, 24, 44, { size: 22, mono: true, weight: 500, color: COLORS.blue });

    if (phase === "show") {
      const since = t - phaseAt;
      const k = Math.floor((since - 600) / SHOW_STEP);
      if (k >= 0 && k < L) {
        const pop = env.reduced ? 1 : 1 + Math.max(0, 1 - ((since - 600) % SHOW_STEP) / 200) * 0.12;
        g.save();
        g.translate(W / 2, 290);
        g.scale(pop, pop);
        symbolCard(g, current.seq[k], -130, -150, 260, 300, { caption: SYMBOLS[current.seq[k]].label.toLowerCase(), state: says ? "active" : "bad" });
        g.restore();
        text(g, `${k + 1} / ${L}`, W / 2, 470, { size: 30, mono: true, weight: 500, align: "center", color: COLORS.muted });
      } else {
        text(g, "Watch closely", W / 2, 300, { size: 48, weight: 600, align: "center", color: COLORS.muted });
      }
      if (current.trick && !says) text(g, "Only obey when the Commander says so.", W / 2, 540, { size: 28, align: "center", color: COLORS.lose });
      return;
    }

    const left = clamp(1 - (t - phaseAt) / inputLimit, 0, 1);
    if (phase === "input") {
      g.fillStyle = "rgba(255,171,40,.9)";
      g.fillRect(0, H - 8, W * left, 8);
    }
    players.forEach((p, i) => {
      const z = zone(i);
      const color = n === 2 ? PLAYER_COLORS[i] : COLORS.blue;
      const cw = Math.min(118, (z.w - 50) / Math.max(L, 1) - 10);
      const total = L * (cw + 10) - 10;
      const x0 = z.cx - total / 2;
      const y0 = 128;
      if (!p.alive && phase !== "result") {
        text(g, "OUT", z.cx, 260, { size: 64, weight: 700, align: "center", color: COLORS.lose });
        return;
      }
      if (current.trick && !says) {
        symbolCard(g, current.seq[0], z.cx - 80, y0, 160, 190, { caption: "don't", state: p.status === "fail-trick" ? "bad" : "idle", progress: p.holdProgress });
      } else {
        for (let k = 0; k < L; k++) {
          const lockedK = k < p.idx;
          const isCur = k === p.idx && p.status !== "done" && !p.status.startsWith("fail");
          const reveal = lockedK || phase === "result";
          const state = lockedK ? "good" : isCur ? "active" : phase === "result" && p.status.startsWith("fail") && k === p.idx ? "bad" : "idle";
          const x = x0 + k * (cw + 10);
          symbolCard(g, reveal ? current.seq[k] : "none", x, y0, cw, cw * 1.25, { state, progress: isCur ? p.holdProgress : 0 });
          if (!reveal) text(g, "?", x + cw / 2, y0 + cw * 0.8, { size: cw * 0.5, weight: 700, align: "center", color: COLORS.muted });
        }
      }
      if (n === 2) text(g, `P${i + 1}`, z.cx, y0 + 230, { size: 26, mono: true, weight: 600, align: "center", color });
      let status = "";
      let col: string = COLORS.muted;
      if (phase === "input") {
        if (p.status === "done") { status = "Locked in"; col = COLORS.win; }
        else if (p.status.startsWith("fail")) { status = p.status === "fail-trick" ? "That was a trick" : "Wrong sign"; col = COLORS.lose; }
        else if (current.trick && !says) { status = "Stay still"; col = COLORS.lose; }
        else status = `${p.idx} / ${L} locked`;
      } else if (phase === "result") {
        if (p.status === "done" || p.status === "ok") { status = current.trick && !says ? "Nice restraint" : "Clean copy"; col = COLORS.win; }
        else if (!p.alive) { status = "Eliminated"; col = COLORS.lose; }
        else { status = p.status === "fail-time" ? "Out of time" : p.status === "fail-trick" ? "That was a trick" : "Wrong sign"; col = COLORS.lose; }
      }
      text(g, status, z.cx, y0 + (n === 2 ? 270 : 250), { size: 30, weight: 600, align: "center", color: col });
    });
    drawDetected(g);
  }

  function drawQuiz(g: CanvasRenderingContext2D) {
    const t = now();
    if (phase === "intro") {
      bannerText(g, "KUIS ISYARAT", H * 0.3, 84);
      text(g, String(Math.max(1, Math.ceil((T0 - t) / 1000))), W / 2, H * 0.55, { size: 160, weight: 700, align: "center", color: COLORS.accent });
      text(g, "Answer with your hand: fist A, palm B, peace C, thumbs up D.", W / 2, H * 0.7, { size: 26, align: "center", color: COLORS.muted });
      return;
    }
    if (round < 0 || round >= QUESTIONS.length) return;
    const q = QUESTIONS[round];
    const family = getComputedStyle(document.body).fontFamily;
    panel(g, 24, 20, W - 48, 150, 18, "rgba(14,17,22,.82)", "rgba(133,180,255,.5)");
    g.font = `600 32px ${family}`;
    const lines = wrap(g, q.q, W - 110);
    text(g, `QUESTION ${round + 1} / ${QUESTIONS.length}`, 48, 52, { size: 20, mono: true, weight: 500, color: COLORS.blue, shadow: false });
    lines.slice(0, 3).forEach((l, i) => text(g, l, 48, 94 + i * 38, { size: 32, weight: 600, shadow: false }));
    const left = clamp(1 - (t - phaseAt) / inputLimit, 0, 1);
    if (phase === "input") {
      g.fillStyle = "rgba(255,171,40,.9)";
      g.fillRect(24, 166, (W - 48) * left, 6);
    }
    const cw = (W - 48 - 3 * 14) / 4;
    const y = H - 300;
    q.options.forEach((opt, k) => {
      const x = 24 + k * (cw + 14);
      const correct = phase === "result" && k === q.answer;
      const picked = players.map((p, i) => ({ p, i })).filter((x2) => x2.p.answer === k);
      const wrongPick = phase === "result" && picked.length > 0 && k !== q.answer;
      panel(g, x, y, cw, 232, 16, "rgba(14,17,22,.84)", correct ? COLORS.win : wrongPick ? COLORS.lose : "rgba(255,255,255,.3)", correct || wrongPick ? 6 : 2);
      panel(g, x + 12, y + 12, 40, 40, 10, COLORS.accent);
      text(g, LETTERS[k], x + 32, y + 42, { size: 26, weight: 700, color: "#211600", align: "center", shadow: false });
      drawSymbol(g, QUIZ_SIGNS[k], x + cw - 46, y + 38, 44);
      g.font = `600 24px ${family}`;
      wrap(g, opt, cw - 30).slice(0, 3).forEach((l, i) => text(g, l, x + 16, y + 100 + i * 30, { size: 24, weight: 600, shadow: false }));
      picked.forEach(({ i }, j) => {
        const col = n === 2 ? PLAYER_COLORS[i] : COLORS.blue;
        panel(g, x + 14 + j * 62, y + 186, 54, 32, 16, col);
        text(g, n === 2 ? `P${i + 1}` : "YOU", x + 41 + j * 62, y + 210, { size: 18, weight: 700, color: "#0e1116", align: "center", shadow: false });
      });
      players.forEach((p, i) => {
        const h = env.tracker.latest.players[i];
        if (phase === "input" && p.answer < 0 && h?.present && h.symbol === QUIZ_SIGNS[k] && p.holdProgress > 0) {
          arc(g, x + cw - 46, y + 38, 36, p.holdProgress, n === 2 ? PLAYER_COLORS[i] : COLORS.accent, 6);
        }
      });
    });
    if (phase === "result") {
      players.forEach((p, i) => {
        const ok = p.answer === q.answer;
        const label = p.answer < 0 ? "No answer" : ok ? "Correct" : "Not quite";
        const x = n === 2 ? W * (0.25 + 0.5 * i) : W / 2;
        text(g, `${n === 2 ? `P${i + 1}: ` : ""}${label}`, x, 240, { size: 44, weight: 700, align: "center", color: ok ? COLORS.win : COLORS.lose });
      });
    } else {
      players.forEach((p, i) => {
        const x = n === 2 ? W * (0.25 + 0.5 * i) : W / 2;
        const who = n === 2 ? `P${i + 1} ` : "";
        pill(g, p.answer >= 0 ? `${who}locked ${LETTERS[p.answer]}` : `${who}${env.tracker.latest.players[i]?.present ? "hold a sign" : "no hand yet"}`, x, 250, p.answer >= 0 ? COLORS.win : COLORS.muted);
      });
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = "rgba(14,17,22,.3)";
    g.fillRect(0, 0, W, H);
    if (phase === "over") {
      bannerText(g, quiz ? "THAT'S A WRAP" : "GAME OVER", H * 0.45, 100, COLORS.accent);
      return;
    }
    if (quiz) drawQuiz(g); else drawSimon(g);
  }

  function hud(): Hud {
    const sub = (p: Sp) => (quiz ? `${p.correct} correct` : p.alive ? "♥".repeat(Math.max(0, p.lives)) : "out");
    return {
      players: players.map((p, i) => ({
        name: n === 2 ? `Player ${i + 1}` : "You", score: p.score, color: PLAYER_COLORS[i], sub: sub(p), active: p.alive,
      })),
      label: quiz
        ? (round >= 0 ? `Question ${Math.min(round + 1, QUESTIONS.length)} / ${QUESTIONS.length}` : "Get ready")
        : round >= 0 ? `Round ${round + 1}` : "Get ready",
      hint: quiz ? "Fist A, palm B, peace C, thumbs up D. Hold for 0.7 s." : "Hold each sign for half a second. Obey only when the Commander says.",
      actions: quiz
        ? LETTERS.map((l, k) => ({ id: `a${k}`, label: `${l}  ${SYMBOLS[QUIZ_SIGNS[k]].glyph}`, disabled: phase !== "input" || players[0].answer >= 0 }))
        : [],
    };
  }

  return {
    skeleton: "full",
    update,
    draw,
    hud,
    action(id) {
      if (!quiz || phase !== "input" || !id.startsWith("a")) return;
      const k = Number(id.slice(1));
      const p = players[0];
      if (p.answer >= 0 || !(k >= 0 && k < 4)) return;
      p.answer = k;
      p.answeredAt = now();
    },
    destroy() {
      finished = true;
      if (concludeTimer) clearTimeout(concludeTimer);
    },
  };
}

// ---------------------------------------------------------------- podium overlay (photo moment)

function podium(g: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, scores: number[], winner: number | null) {
  g.save();
  g.beginPath();
  g.rect(rect.x, rect.y, rect.w, rect.h);
  g.clip();
  const base = rect.y + rect.h;
  const cx = rect.x + rect.w / 2;
  const colors = ["rgba(133,180,255,.85)", "rgba(255,171,40,.85)"];
  if (scores.length === 1) {
    g.fillStyle = colors[1];
    g.fillRect(cx - 150, base - 90, 300, 90);
  } else {
    scores.forEach((_, i) => {
      const isWin = winner === i;
      const h = isWin ? 130 : 80;
      const x = rect.x + rect.w * (0.25 + 0.5 * i) - 150;
      g.fillStyle = colors[i];
      g.fillRect(x, base - h, 300, h);
      g.fillStyle = "#0e1116";
      g.font = "700 54px ui-sans-serif, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(isWin ? "1" : winner === null ? "=" : "2", x + 150, base - h + 66);
    });
  }
  const rand = mulberry32(7);
  const palette = ["#ffab28", "#85b4ff", "#3ddc97", "#ff7ab6", "#f3f2ed"];
  for (let i = 0; i < 70; i++) {
    g.save();
    g.translate(rect.x + rand() * rect.w, rect.y + rand() * rect.h * 0.7);
    g.rotate(rand() * Math.PI);
    g.fillStyle = palette[i % palette.length];
    g.globalAlpha = 0.9;
    g.fillRect(-7, -3, 14, 6);
    g.restore();
  }
  if (winner !== null || scores.length === 1) {
    const x = scores.length === 1 ? cx : rect.x + rect.w * (0.25 + 0.5 * (winner ?? 0));
    g.fillStyle = "#ffab28";
    g.beginPath();
    g.moveTo(x - 60, rect.y + 130);
    g.lineTo(x - 60, rect.y + 70);
    g.lineTo(x - 30, rect.y + 100);
    g.lineTo(x, rect.y + 56);
    g.lineTo(x + 30, rect.y + 100);
    g.lineTo(x + 60, rect.y + 70);
    g.lineTo(x + 60, rect.y + 130);
    g.closePath();
    g.fill();
  }
  g.restore();
}
