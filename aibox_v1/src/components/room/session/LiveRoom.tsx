"use client";

import {
  ArrowRight, Check, CheckCircle2, Clock, Hand, Loader2, Play, RefreshCw, RotateCcw, ScanFace, Sparkles, Timer as TimerIcon,
  TriangleAlert, Users, VideoOff, WifiOff, X, Camera as CameraIcon, Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROUNDS, type JoinRes, type Peer } from "../../../lib/room/protocol";
import type { LocalCamera } from "../../../lib/room/useLocalCamera";
import { useRoomSession } from "../../../lib/room/useRoomSession";
import { HostControls, InviteStrip } from "./HostControls";
import { PeerTile } from "./PeerTile";
import { RoundReview } from "./RoundReview";
import s from "./session.module.css";
import { StatePanel } from "./StatePanel";
import { usePeaceGesture } from "./usePeaceGesture";

function useClock(endsAt: number | null | undefined) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt || left === null) return null;
  const total = Math.ceil(left / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function LiveRoom({ join, name, camera, mp }: { join: JoinRes; name: string; camera: LocalCamera; mp: boolean }) {
  const router = useRouter();
  const sess = useRoomSession({ join, name, camera, mp });
  const { view, isHost } = sess;
  const session = view.session;
  const phase = session?.phase ?? "lobby";
  const trigger = session?.trigger ?? "manual";
  const quorum = session?.quorum ?? "all";
  const maxDevices = view.room.maxDevices || join.room.maxDevices;
  const clock = useClock(session?.sessionEndsAt);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [manual, setManual] = useState<{ key: string; on: boolean } | null>(null);
  const poseKey = `${session?.round ?? 0}:${session?.attempt ?? 0}`;

  const me: Peer = useMemo(
    () =>
      view.peers.find((p) => p.id === view.youId) ?? {
        id: view.youId ?? "me", name, slot: join.slot, role: join.role, connected: true, ready: false, peace: false,
      },
    [view.peers, view.youId, name, join.slot, join.role],
  );
  const others = view.peers.filter((p) => p.id !== me.id);
  // welcome.peers lists only the OTHER devices, so add this one
  const connectedCount = view.peers.filter((p) => p.connected && p.id !== view.youId).length + 1;

  // ----- AI peace trigger -----
  const peaceActive = phase === "pose_ready" && trigger === "peace";
  const engine = usePeaceGesture({
    preload: mp && trigger === "peace" && (phase === "lobby" || phase === "pose_ready"),
    active: peaceActive,
    getVideo: camera.getVideo,
    onChange: sess.setPeace,
  });
  const needsFallback = trigger === "peace" && (!mp || engine === "failed");

  const manualPeace = peaceActive && manual?.key === poseKey && manual.on;
  const manualRef = useRef(false);
  const setPeaceRef = useRef(sess.setPeace);
  useEffect(() => {
    manualRef.current = manualPeace;
    setPeaceRef.current = sess.setPeace;
  });
  // lower the manual "ready" when the pose phase ends so the next round needs a fresh one
  useEffect(
    () => () => {
      if (manualRef.current) setPeaceRef.current(false);
    },
    [peaceActive, poseKey],
  );

  // ----- finish handling -----
  const completed = view.completed;
  useEffect(() => {
    if (!completed) return;
    const id = setTimeout(() => router.push(`/room/result/${completed.resultId}`), 3200);
    return () => clearTimeout(id);
  }, [completed, router]);

  useEffect(() => {
    if (completed) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [completed]);

  // ----- early exits -----
  if (completed) {
    return (
      <div className={s.root}>
        <StatePanel icon={Sparkles} title="Your photostrip is ready!" celebrate actions={<Link className="button button-primary" href={`/room/result/${completed.resultId}`}>Open it now <ArrowRight size={16} aria-hidden="true" /></Link>}>
          The session is complete. Taking you to the result...
        </StatePanel>
      </div>
    );
  }
  if (view.room.status === "completed" && view.link !== "open") {
    return (
      <div className={s.root}>
        <StatePanel icon={CheckCircle2} title="This session has finished" actions={view.room.resultId ? <Link className="button button-primary" href={`/room/result/${view.room.resultId}`}>See the photostrip</Link> : <Link className="button button-primary" href="/room">Create a room</Link>}>
          {view.room.resultId ? "The photostrip is ready to view and download." : "This room is closed."}
        </StatePanel>
      </div>
    );
  }
  if (view.ended) {
    return (
      <div className={s.root}>
        <StatePanel icon={WifiOff} title="You were disconnected" actions={<button className="button button-primary" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden="true" /> Rejoin</button>}>
          The room closed this connection. You can rejoin with the same link while the session is still open.
        </StatePanel>
      </div>
    );
  }

  // ----- derived -----
  const round = session?.round ?? 0;
  const hostPeer = view.peers.find((p) => p.role === "host");
  const hostAway = !isHost && !!hostPeer && !hostPeer.connected;
  const p2pFailed = !sess.p2pSupported || Object.values(view.linkStates).includes("failed");
  const linkBusy = view.link !== "open";
  const roundReady = view.roundReady && view.roundReady.round === round ? view.roundReady : null;
  const reviewUrls = roundReady ? [...roundReady.stills].sort((a, b) => a.slot - b.slot).map((x) => x.url) : [];
  const peaceCounts = view.peace?.counts ?? {};
  const retakes = session?.retakesLeft ?? 0;
  const lastRound = round >= ROUNDS - 1;

  const tiles = Array.from({ length: Math.max(2, maxDevices) }, (_, slot) => {
    const peer = slot === me.slot ? me : others.find((p) => p.slot === slot) ?? null;
    return { slot, peer };
  });

  const banners: { key: string; tone: "warn" | "bad" | "info"; icon: typeof TriangleAlert; text: string; close?: boolean }[] = [];
  if (linkBusy) banners.push({ key: "link", tone: "warn", icon: WifiOff, text: view.everOpen ? "Connection lost. Reconnecting..." : "Connecting to the room..." });
  if (hostAway) banners.push({ key: "host", tone: "warn", icon: Clock, text: "Waiting for the host to come back. The session is paused." });
  if (p2pFailed) banners.push({ key: "p2p", tone: "warn", icon: VideoOff, text: "Friends' video unavailable, photos still work." });
  else if (view.saveMode) banners.push({ key: "save", tone: "info", icon: WifiOff, text: "Slow network: friends' video quality was reduced." });
  if (camera.status === "error") banners.push({ key: "cam", tone: "bad", icon: CameraIcon, text: camera.error ?? "Your camera stopped. Allow Camera access and retry." });
  if (view.notice && dismissed !== view.notice) banners.push({ key: "notice", tone: "bad", icon: TriangleAlert, text: view.notice, close: true });

  // ----- main visual -----
  let main;
  if (phase === "composing") {
    const steps = [
      ["loading", "Collecting your photos"],
      ["building", "Arranging the group shots"],
      ["uploading", "Saving the photostrip"],
    ] as const;
    const order = ["idle", "loading", "building", "uploading", "done"];
    main = isHost ? (
      <StatePanel
        icon={view.compose === "failed" ? TriangleAlert : Wand2}
        spin={view.compose !== "failed"}
        title={view.compose === "failed" ? "The photostrip could not be saved" : "Building your photostrip"}
        actions={view.compose === "failed" ? <button className="button button-primary" onClick={sess.retryCompose}><RefreshCw size={16} aria-hidden="true" /> Try again</button> : undefined}
      >
        {view.compose === "failed" ? "Keep this page open and try again." : "Keep this page open. This takes a few seconds."}
        {view.compose !== "failed" && (
          <ul className={s.steps} style={{ marginTop: 14 }}>
            {steps.map(([key, label]) => {
              const done = order.indexOf(view.compose) > order.indexOf(key);
              return (
                <li key={key} className={done ? s.stepsDone : undefined}>
                  {done ? <Check size={14} aria-hidden="true" /> : <Loader2 size={14} className={view.compose === key ? s.spin : undefined} aria-hidden="true" />}
                  {label}
                </li>
              );
            })}
          </ul>
        )}
      </StatePanel>
    ) : (
      <StatePanel icon={Wand2} spin title="Host is building your photostrip">Hang tight. You will be taken to the result as soon as it is ready.</StatePanel>
    );
  } else if (phase === "reviewing" && roundReady) {
    main = (
      <>
        <RoundReview
          frameId={view.room.frameId}
          urls={reviewUrls}
          tileKey={`${roundReady.round}:${roundReady.attempt}:${roundReady.stills.map((x) => x.slot).join(",")}`}
        />
        {roundReady.missing.length > 0 && <p className={s.muted}>{roundReady.missing.length} photo(s) did not arrive in time and were left out of this shot.</p>}
      </>
    );
  } else if (phase === "reviewing") {
    main = <StatePanel icon={Loader2} spin title="Getting the group shot">Photos are on their way.</StatePanel>;
  } else {
    main = (
      <div className={s.grid}>
        {tiles.map(({ slot, peer }) => (
          <PeerTile
            key={slot}
            peer={peer}
            isSelf={peer?.id === me.id}
            stream={peer?.id === me.id ? camera.stream : peer ? view.remoteStreams[peer.id] : null}
            bindVideo={camera.bindVideo}
            linkState={peer ? view.linkStates[peer.id] : undefined}
            peace={peer ? (peaceCounts[peer.id] ?? peer.peace) && phase === "pose_ready" : false}
            ready={peer?.ready && phase === "lobby"}
            p2pDown={p2pFailed}
          />
        ))}
      </div>
    );
  }

  // ----- side panels -----
  const side = (
    <div className={s.stack}>
      {(phase === "lobby" || phase === "pose_ready") && isHost && (
        <HostControls trigger={trigger} quorum={quorum} disabled={linkBusy} onChange={sess.setSettings} />
      )}
      {(phase === "lobby" || phase === "pose_ready") && !isHost && (
        <section className={s.card}>
          <span className={s.label}>photo trigger</span>
          <h2>{trigger === "peace" ? "AI Peace" : trigger === "timer" ? "Timer" : "Manual"}</h2>
          <p className={s.muted}>
            {phase === "lobby" ? "Waiting for the host to start. Tap Ready when you are set." : trigger === "peace" ? "Show a peace sign to the camera when everyone is ready." : "Get ready. The host will start the countdown."}
          </p>
        </section>
      )}
      {phase === "lobby" && isHost && <InviteStrip roomId={join.room.id} joinCode={view.room.joinCode || join.room.joinCode} />}
      {phase === "pose_ready" && trigger === "peace" && (
        <section className={s.card} aria-live="polite">
          <span className={s.label}>pose together</span>
          {view.peace && (
            <span className={`${s.pill} ${view.peace.have >= view.peace.needed ? s.pillFull : ""}`}><Hand size={15} aria-hidden="true" />{view.peace.have}/{view.peace.needed} ready</span>
          )}
          <p className={s.muted}>
            {needsFallback ? "Hand detection is unavailable on this device. Tap I'm ready when you are set." : engine === "loading" ? "Loading hand detection..." : "Show a peace sign to the camera, then hold it."}
          </p>
        </section>
      )}
      {phase === "collecting" && (
        <section className={s.card} aria-live="polite">
          <span className={s.label}>your photo</span>
          <p className={s.muted}>
            {view.upload === "failed" ? "We could not upload your photo." : view.upload === "done" ? "Your photo is in. Waiting for everyone else..." : "Uploading your photo..."}
          </p>
          {view.upload === "failed" && <button className="button button-primary" onClick={sess.retryUpload}><RefreshCw size={16} aria-hidden="true" /> Retry upload</button>}
        </section>
      )}
      {phase === "reviewing" && (
        <section className={s.card}>
          <span className={s.label}>shot {round + 1} of {ROUNDS}</span>
          <h2>{isHost ? "How does it look?" : "Waiting for host"}</h2>
          <p className={s.muted}>{isHost ? `Keep it, or retake (${retakes} retake${retakes === 1 ? "" : "s"} left).` : "The host is reviewing this shot."}</p>
        </section>
      )}
      <p className={s.muted}><Clock size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Keep this page open during the session.</p>
    </div>
  );

  // ----- dock -----
  let dock = null;
  if (phase === "lobby") {
    dock = (
      <div className={s.dockRow}>
        <button className={`button ${s.ghost} ${s.big}`} onClick={() => sess.setReady(!me.ready)} aria-pressed={me.ready}>
          <Check size={18} aria-hidden="true" />{me.ready ? "Ready" : "I'm ready"}
        </button>
        {isHost && (
          <button className={`button button-primary ${s.big}`} onClick={sess.startRound} disabled={linkBusy}><Play size={18} aria-hidden="true" />Start</button>
        )}
      </div>
    );
  } else if (phase === "pose_ready") {
    dock = (
      <div className={s.dockRow}>
        {needsFallback && (
          <button
            className={`button ${manualPeace ? "button-primary" : s.ghost} ${s.big}`}
            aria-pressed={manualPeace}
            onClick={() => {
              setManual({ key: poseKey, on: !manualPeace });
              sess.setPeace(!manualPeace);
            }}
          >
            <Hand size={18} aria-hidden="true" />I&apos;m ready
          </button>
        )}
        {isHost ? (
          <button className={`button button-primary ${s.big}`} onClick={sess.startRound} disabled={linkBusy}>
            {trigger === "timer" ? <TimerIcon size={18} aria-hidden="true" /> : <ScanFace size={18} aria-hidden="true" />}
            {trigger === "manual" ? "Take photo" : "Take photo now"}
          </button>
        ) : !needsFallback ? (
          <button className={`button ${s.ghost} ${s.big}`} disabled><Clock size={18} aria-hidden="true" />{trigger === "manual" ? "Waiting for host" : "Get ready"}</button>
        ) : null}
      </div>
    );
  } else if (phase === "reviewing" && roundReady) {
    dock = isHost ? (
      <div className={s.dockRow}>
        <button className={`button ${s.ghost} ${s.big}`} disabled={retakes <= 0 || linkBusy} onClick={() => sess.review(round, "retake")}>
          <RotateCcw size={18} aria-hidden="true" />Retake ({retakes})
        </button>
        <button className={`button button-primary ${s.big}`} disabled={linkBusy} onClick={() => sess.review(round, "accept")}>
          {lastRound ? "Finish" : "Continue"}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    ) : (
      <button className={`button ${s.ghost} ${s.big}`} disabled><Clock size={18} aria-hidden="true" />Waiting for host</button>
    );
  }

  return (
    <div className={s.root}>
      <header className={s.topbar}>
        <div className={s.topTitle}>
          <div className="profile-eyebrow"><span />ai box room</div>
          <h1>{phase === "lobby" ? "Lobby" : phase === "composing" ? "Almost there" : `Shot ${Math.min(round + 1, ROUNDS)} of ${ROUNDS}`}</h1>
        </div>
        <div className={s.topMeta}>
          <div className={s.dots} role="img" aria-label={`Shot ${Math.min(round + 1, ROUNDS)} of ${ROUNDS}`}>
            {Array.from({ length: ROUNDS }, (_, i) => {
              const done = i < round || phase === "composing";
              return <span key={i} className={`${s.dot} ${done ? s.dotDone : i === round ? s.dotNow : ""}`} />;
            })}
          </div>
          <span className={s.chip}><Users size={13} aria-hidden="true" />{connectedCount}/{maxDevices} devices</span>
          {clock && <span className={s.chip} title="Session time left"><Clock size={13} aria-hidden="true" />{clock}</span>}
        </div>
      </header>

      {banners.length > 0 && (
        <div className={s.banners} role="status" aria-live="polite">
          {banners.map(({ key, tone, icon: Icon, text, close }) => (
            <div key={key} className={`${s.banner} ${tone === "warn" ? s.bannerWarn : tone === "bad" ? s.bannerBad : ""}`}>
              <Icon size={16} aria-hidden="true" />
              <p>{text}</p>
              {key === "cam" && <button className={s.bannerClose} onClick={() => void camera.start()} aria-label="Retry camera"><RefreshCw size={15} /></button>}
              {close && <button className={s.bannerClose} onClick={() => setDismissed(view.notice)} aria-label="Dismiss"><X size={15} /></button>}
            </div>
          ))}
        </div>
      )}

      <div className={s.layout}>
        <div className={s.stack}>{main}</div>
        {side}
      </div>

      {dock && <div className={s.dock}>{dock}</div>}

      {view.countdown && phase !== "lobby" && (
        <div className={s.countdown} aria-live="assertive">
          {view.countdown.n !== null && view.countdown.n > 0 ? <b key={view.countdown.n}>{view.countdown.n}</b> : view.countdown.n === null ? <b style={{ fontSize: "min(14vw, 80px)" }}>Get ready</b> : null}
          <span>Look at your camera and pose together</span>
        </div>
      )}
      {view.flash && <div className={s.flash} aria-hidden="true" />}
    </div>
  );
}
