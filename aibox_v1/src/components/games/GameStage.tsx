"use client";

import { Camera, CameraOff, Loader2, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES, type GameId, type GameSetup } from "../../lib/games/catalog";
import { COLORS, PLAYER_COLORS, drawSkeleton } from "../../lib/games/draw";
import { H, W, type Engine, type GameResult, type Hud } from "../../lib/games/engine";
import { loadEngine } from "../../lib/games/engines";
import {
  HandTracker, closeCamera, friendlyCameraError, openCamera,
} from "../../lib/games/hand-input";
import type { GameNet } from "../../lib/games/net";
import { MomentBuffer, cloneCanvas } from "../../lib/games/photo-moment";
import { hubClock, localClock, prefersReducedMotion, type Clock } from "../../lib/games/util";
import styles from "./games.module.css";
import { ResultScreen } from "./ResultScreen";
import { tutorialFor } from "./tutorials";

type Step = "gate" | "starting" | "tutorial" | "waiting" | "playing" | "result";

/** Games where buttons or the pointer are a complete alternative to the camera. */
function cameraOptional(id: GameId, setup: GameSetup) {
  if (id === "suit-arena") return setup.variant !== "pvp";
  if (id === "irisan-buah") return setup.where === "local" && setup.players === 1;
  if (id === "kode-komando") return setup.variant === "quiz" && setup.players === 1;
  return false;
}

type Props = {
  gameId: GameId;
  setup: GameSetup;
  net: GameNet | null;
  onExit: () => void;
};

export function GameStage({ gameId, setup, net, onExit }: Props) {
  const info = GAMES[gameId];
  const remote = setup.where === "remote" && !!net;
  const nPlayers = remote ? 1 : setup.players;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStepState] = useState<Step>("gate");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [chip, setChip] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [readyCount, setReadyCount] = useState("");
  const [round, setRound] = useState(0);
  const [noCamUi, setNoCamUi] = useState(false);
  const S = useRef({
    step: "gate" as Step,
    tracker: null as HandTracker | null,
    moments: null as MomentBuffer | null,
    stream: null as MediaStream | null,
    engine: null as Engine | null,
    clock: null as Clock | null,
    noCamera: false,
    handledStart: 0,
    tutorialDone: false,
    launching: false,
  });
  const tutorial = tutorialFor(gameId, setup);

  const setStep = useCallback((s: Step) => {
    S.current.step = s;
    setStepState(s);
  }, []);

  // ---------------------------------------------------------------- launch

  const finish = useCallback((r: GameResult) => {
    const s = S.current;
    if (s.step === "result") return;
    const burst = r.burst.map(cloneCanvas);
    s.engine?.destroy();
    s.engine = null;
    s.tracker?.stop();
    s.moments?.stop();
    closeCamera(videoRef.current, s.stream);
    s.stream = null;
    s.tutorialDone = true;
    net?.ready(false);
    setResult({ ...r, burst });
    setHud(null);
    setStep("result");
  }, [net, setStep]);

  const launch = useCallback(async (startAt?: number, seed?: number) => {
    const s = S.current;
    if (s.launching || s.engine) return;
    s.launching = true;
    try {
      const factory = await loadEngine(gameId);
      if (!s.tracker) return;
      const clock: Clock = remote && net ? hubClock(() => net.now()) : localClock();
      s.clock = clock;
      const engine = factory({
        tracker: s.tracker,
        moments: s.moments,
        net: remote ? net : null,
        setup,
        clock,
        seed: seed ?? Math.floor(Math.random() * 2 ** 31),
        startAt: startAt ?? clock.now(),
        reduced: prefersReducedMotion(),
        noCamera: s.noCamera,
        finish,
      });
      s.engine = engine;
      setStep("playing");
    } finally {
      s.launching = false;
    }
  }, [finish, gameId, net, remote, setStep, setup]);

  const afterTutorial = useCallback(() => {
    const s = S.current;
    s.tutorialDone = true;
    if (remote && net) {
      setStep("waiting");
      net.ready(true);
      const st = net.gameState;
      if (st?.startAt && st.startAt !== s.handledStart && st.startAt > net.now() + 400 && st.phase !== "ended") {
        s.handledStart = st.startAt;
        void launch(st.startAt, st.seed);
      }
    } else {
      void launch();
    }
  }, [launch, net, remote, setStep]);

  // remote: the host's start arrives as game_state { startAt, seed }
  useEffect(() => {
    if (!remote || !net) return;
    const off = net.on("state", (m) => {
      const s = S.current;
      if (s.step !== "waiting" || !m.startAt || m.startAt === s.handledStart) return;
      if (m.phase !== "countdown" && m.phase !== "playing") return;
      s.handledStart = m.startAt;
      void launch(m.startAt, m.seed);
    });
    return () => { off(); };
  }, [launch, net, remote]);

  useEffect(() => {
    if (!remote || !net) return;
    const update = () => {
      const peers = net.peers.filter((p) => p.connected);
      setReadyCount(`${peers.filter((p) => p.ready).length} of ${peers.length} ready`);
    };
    update();
    const off = net.on("peers", update);
    return () => { off(); };
  }, [net, remote]);

  // ---------------------------------------------------------------- camera

  const enableCamera = useCallback(async (withCamera: boolean) => {
    const s = S.current;
    setError(null);
    s.noCamera = !withCamera;
    setNoCamUi(!withCamera);
    const tracker = s.tracker ?? new HandTracker({ players: nPlayers });
    s.tracker = tracker;
    void loadEngine(gameId); // warm the chunk
    if (!withCamera) {
      if (s.tutorialDone) afterTutorial(); else setStep("tutorial");
      return;
    }
    setStep("starting");
    const video = videoRef.current;
    if (!video) return;
    try {
      s.stream = await openCamera(video);
    } catch (e) {
      closeCamera(video, null);
      setError(friendlyCameraError(e));
      setStep("gate");
      return;
    }
    s.stream.getVideoTracks().forEach((t) => {
      t.onended = () => {
        if (S.current.step === "result") return;
        setError("The camera was disconnected or access was revoked. Reconnect it or allow Camera in site settings, then try again.");
        s.engine?.destroy();
        s.engine = null;
        tracker.stop();
        s.moments?.stop();
        s.stream = null;
        setStep("gate");
      };
    });
    s.moments?.stop();
    s.moments = new MomentBuffer(video);
    s.moments.start();
    try {
      await tracker.start(video);
    } catch {
      closeCamera(video, s.stream);
      s.stream = null;
      s.moments?.stop();
      setError("Your camera is ready, but hand tracking could not load. Check your internet connection and retry.");
      setStep("gate");
      return;
    }
    if (s.tutorialDone) afterTutorial(); else setStep("tutorial");
  }, [afterTutorial, gameId, nPlayers, setStep]);

  // 10 second tutorial, then continue automatically
  useEffect(() => {
    if (step !== "tutorial") return;
    const id = setTimeout(afterTutorial, 10_000);
    return () => clearTimeout(id);
  }, [step, afterTutorial]);

  const playAgain = useCallback(() => {
    const s = S.current;
    net?.resetLogs();
    s.engine = null;
    setResult(null);
    setRound((r) => r + 1);
    void enableCamera(!s.noCamera);
  }, [enableCamera, net]);

  // ---------------------------------------------------------------- render loop

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const g = canvas.getContext("2d");
    if (!g) return;
    let raf = 0;
    let lastHud = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = S.current;
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.clearRect(0, 0, W, H);
      const engine = s.engine;
      const live = s.step === "playing" && engine;
      if (live) {
        engine.update();
        if (!S.current.engine) return; // finished during update
        engine.draw(g);
      }
      const mode = live ? engine.skeleton : s.step === "result" || s.step === "gate" ? "none" : "full";
      if (mode !== "none" && s.tracker) {
        s.tracker.latest.players.forEach((h, i) => {
          drawSkeleton(g, h, nPlayers > 1 ? PLAYER_COLORS[i] : COLORS.blue, 0.9, mode === "tip");
        });
      }
      const nowMs = performance.now();
      if (nowMs - lastHud > 130) {
        lastHud = nowMs;
        if (live) setHud(engine.hud());
        const t = s.tracker;
        if (t && t.status === "running") {
          setChip(`${Math.round(t.fps)} fps${t.delegate ? ` / ${t.delegate.toLowerCase()}` : ""}${t.lite ? " / lite" : ""}`);
        } else setChip("");
      }
    };
    raf = requestAnimationFrame(loop);
    const onVisibility = () => {
      const clock = S.current.clock;
      if (document.hidden) clock?.pause(); else clock?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [nPlayers]);

  // dispose everything on unmount (the recognizer is closed once, not per round)
  useEffect(() => {
    const s = S.current;
    const video = videoRef.current;
    return () => {
      s.engine?.destroy();
      s.engine = null;
      s.tracker?.dispose();
      s.tracker = null;
      s.moments?.stop();
      closeCamera(video, s.stream);
      s.stream = null;
      net?.ready(false);
    };
  }, [net]);

  // ---------------------------------------------------------------- pointer fallback

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean | null) => {
    const engine = S.current.engine;
    if (!engine?.pointer) return;
    if (down === null) return engine.pointer(null);
    const rect = e.currentTarget.getBoundingClientRect();
    engine.pointer({ x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H, down });
  };

  // ---------------------------------------------------------------- view

  const overlay = step === "gate" || step === "starting" || step === "tutorial" || step === "waiting";
  const optional = cameraOptional(gameId, setup);

  return (
    <div className={styles.stageWrap}>
      <div hidden={step === "result"}>
        {step === "playing" && hud ? (
          <div className={styles.hud} aria-live="polite">
            {hud.players.map((p, i) => (
              <div key={`${p.name}-${i}`} className={`${styles.hudPlayer} ${p.active === false ? styles.out : ""}`} style={{ ["--pc" as string]: p.color }}>
                <span className={styles.hudName}>{p.name}</span>
                <span className={styles.hudScore}>{p.score}</span>
                {p.sub ? <span className={styles.hudSub}>{p.sub}</span> : <span />}
              </div>
            ))}
            <div className={styles.hudRight}>
              {hud.timer ? <span className={styles.hudTimer}>{hud.timer}</span> : null}
              {hud.label ? <span className={styles.hudLabel}>{hud.label}</span> : null}
            </div>
          </div>
        ) : null}

        <div className={`${styles.stage} ${overlay ? styles.stageTall : ""}`} style={{ marginTop: step === "playing" && hud ? 12 : 0 }}>
          <video ref={videoRef} className={styles.video} playsInline muted aria-label="Your camera preview, mirrored" />
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${step === "playing" ? styles.live : ""}`}
            aria-label={`${info.name} game board`}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); onPointer(e, true); }}
            onPointerMove={(e) => onPointer(e, e.buttons > 0 || e.pointerType === "touch")}
            onPointerUp={(e) => onPointer(e, false)}
            onPointerCancel={(e) => onPointer(e, null)}
            onPointerLeave={(e) => onPointer(e, null)}
          />
          {chip ? <span className={styles.statusChip}>{chip}</span> : null}

          {overlay ? (
            <div className={styles.overlay}>
              <div className={styles.overlayCard}>
                {step === "gate" || step === "starting" ? (
                  <>
                    <p className="micro">camera needed</p>
                    <h3>{info.name} plays with your hands</h3>
                    <p>
                      Allow your camera so the game can see your hand. The video never leaves your device. Hand tracking runs
                      in your browser{remote ? ", and an online room only shares hand points (21 dots), never your video" : ""}.
                      {gameId === "tepuk-sinkron" && remote ? " At the very end, one small high-five photo is swapped with your partner for the shared frame." : ""}
                    </p>
                    {error ? <p className={styles.error} role="alert">{error}</p> : null}
                    <div className={styles.row}>
                      <button type="button" className="button button-primary" onClick={() => void enableCamera(true)} disabled={step === "starting"}>
                        {step === "starting" ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
                        {step === "starting" ? "Starting camera..." : error ? "Try again" : "Enable camera"}
                      </button>
                      {optional ? (
                        <button type="button" className={styles.btnGhost} onClick={() => void enableCamera(false)} disabled={step === "starting"}>
                          <CameraOff size={16} aria-hidden="true" /> Play without camera
                        </button>
                      ) : null}
                      <button type="button" className={styles.btnGhost} onClick={onExit}>Back</button>
                    </div>
                    {step === "starting" ? <p>Loading hand tracking, about 8 MB the first time.</p> : null}
                  </>
                ) : null}

                {step === "tutorial" ? (
                  <>
                    <p className="micro">how to play / 10 s</p>
                    <h3>{tutorial.title}</h3>
                    <p>{tutorial.intro}</p>
                    <div className={styles.tutSteps}>
                      {tutorial.steps.map((t) => (
                        <div key={t.title} className={styles.tutStep}>
                          <t.icon size={30} aria-hidden="true" />
                          <strong>{t.title}</strong>
                          <span>{t.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.tutBar} aria-hidden="true"><i /></div>
                    <div className={styles.row}>
                      <button type="button" className="button button-primary" onClick={afterTutorial}>
                        {remote ? "I'm ready" : "Start now"}
                      </button>
                    </div>
                    <p>{noCamUi ? "Playing without the camera. Use the buttons or your pointer." : "Raise a hand and check that you see the blue skeleton."}</p>
                  </>
                ) : null}

                {step === "waiting" ? (
                  <>
                    <p className="micro">online room</p>
                    <h3>You are ready</h3>
                    <p>
                      <Users size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {readyCount || "Waiting for friends"}.
                      {net?.isHost ? " Press Start game above when everyone is ready." : " The host will start the game."}
                    </p>
                    <div className={styles.row}>
                      <button type="button" className={styles.btnGhost} onClick={() => { net?.ready(false); onExit(); }}>Leave</button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {step === "playing" && hud ? (
          <div className={styles.belowStage} style={{ marginTop: 12 }}>
            <p className={styles.hint}>{hud.hint}</p>
            {hud.actions?.length ? (
              <div className={styles.actions} role="group" aria-label="Play with buttons">
                {hud.actions.map((a) => (
                  <button key={a.id} type="button" className={styles.btnGhost} disabled={a.disabled} onClick={() => S.current.engine?.action?.(a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {step === "gate" ? (
          <p className={styles.info}>
            <ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Camera frames are processed on your device only.
          </p>
        ) : null}
      </div>

      {step === "result" && result ? (
        <ResultScreen
          key={round}
          gameId={gameId}
          result={result}
          remote={remote}
          isHost={!!net?.isHost}
          onAgain={playAgain}
          onExit={onExit}
        />
      ) : null}
    </div>
  );
}
