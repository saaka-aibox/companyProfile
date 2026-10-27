"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Monitor, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GAMES, LOCAL_MODES, type GameId, type GameSetup } from "../../lib/games/catalog";
import type { GameNet } from "../../lib/games/net";
import { GameStage } from "./GameStage";
import styles from "./games.module.css";
import { RoomEntry, RoomLobby } from "./RoomPanel";

type View = "choose" | "room" | "play";
const MIN_ONLINE: Record<GameId, number> = { "suit-arena": 2, "irisan-buah": 2, "kode-komando": 2, "tepuk-sinkron": 2 };

export function GameRunner({ slug }: { slug: GameId }) {
  const info = GAMES[slug];
  const [view, setView] = useState<View>("choose");
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [net, setNet] = useState<GameNet | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);

  // /games/<slug>?room=<roomId> opens the join prompt
  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      // The query string is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvited(room);
      setView("room");
    }
  }, []);

  useEffect(() => () => net?.close(), [net]);

  const leave = useCallback(() => {
    setNet(null);
    setRoomId(null);
    setSetup(null);
    setInvited(null);
    setView("choose");
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const startLocal = (mode: (typeof LOCAL_MODES)[GameId][number]) => {
    setSetup({ where: "local", players: mode.players, variant: mode.variant });
    setView("play");
  };

  const connected = (n: GameNet, id: string) => {
    setNet(n);
    setRoomId(id);
    setSetup({ where: "remote", players: 1, variant: "remote" });
    setView("play");
    window.history.replaceState(null, "", `${window.location.pathname}?room=${encodeURIComponent(id)}`);
  };

  return (
    <section className={`profile-container ${styles.wrap}`}>
      <div className={styles.crumbs}>
        <Link className={styles.back} href="/games"><ArrowLeft size={14} aria-hidden="true" /> all games</Link>
      </div>
      <header className={styles.gameHead}>
        <p className="profile-eyebrow"><span />{info.subtitle.toLowerCase()}</p>
        <h1>{info.name}</h1>
        <p>{info.blurb}</p>
      </header>

      {view === "choose" ? (
        <div className={styles.chooser}>
          <div className={styles.panel}>
            <h3><Monitor size={20} aria-hidden="true" /> This device</h3>
            <p>One screen and one camera. {info.players.split(",")[0]}.</p>
            <div className={styles.modeList}>
              {LOCAL_MODES[slug].map((m) => (
                <button key={m.id} type="button" className={styles.mode} onClick={() => startLocal(m)}>
                  <span><strong>{m.label}</strong><small>{m.desc}</small></span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.panel}>
            <h3><Wifi size={20} aria-hidden="true" /> Play with friends</h3>
            <p>
              {info.remote
                ? `${info.remoteDevices}, each on their own device. Only hand points are shared, never your video.`
                : "Online play is not available for this game yet. Try it on one device."}
            </p>
            <div className={styles.modeList}>
              <button type="button" className={styles.mode} disabled={!info.remote} onClick={() => setView("room")}>
                <span><strong>Create or join a room</strong><small>Share a link or a 6 character code.</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {view === "room" ? (
        <RoomEntry gameId={slug} invitedRoom={invited} onConnected={connected} onBack={leave} />
      ) : null}

      {view === "play" && setup ? (
        <>
          {net && roomId ? (
            <RoomLobby net={net} gameId={slug} roomId={roomId} minPlayers={MIN_ONLINE[slug]} onLeave={leave} />
          ) : null}
          <GameStage key={net ? roomId : "local"} gameId={slug} setup={setup} net={net} onExit={leave} />
        </>
      ) : null}
    </section>
  );
}
