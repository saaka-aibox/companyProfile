"use client";

import { Check, Copy, Link2, Loader2, Play, Share2, Users, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GAMES, type GameId } from "../../lib/games/catalog";
import {
  GameNet, createGameRoom, gameShareLink, joinGameRoom, playerName, resolveJoinCode, setPlayerName,
} from "../../lib/games/net";
import styles from "./games.module.css";

// ---------------------------------------------------------------- create or join

type EntryProps = {
  gameId: GameId;
  invitedRoom: string | null;
  onConnected: (net: GameNet, roomId: string) => void;
  onBack: () => void;
};

export function RoomEntry({ gameId, invitedRoom, onConnected, onBack }: EntryProps) {
  const info = GAMES[gameId];
  const router = useRouter();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : playerName()));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect(roomId: string) {
    const clean = name.trim().slice(0, 24) || "Player";
    setPlayerName(clean);
    const net = await joinGameRoom(roomId, clean);
    if (net.room.gameId && net.room.gameId !== gameId) {
      net.close();
      router.push(`/games/${net.room.gameId}?room=${encodeURIComponent(roomId)}`);
      return;
    }
    onConnected(net, roomId);
  }

  async function create() {
    setBusy("create");
    setError(null);
    try {
      const room = await createGameRoom(gameId);
      await connect(room.roomId);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function join(roomId?: string) {
    setBusy("join");
    setError(null);
    try {
      let id = roomId;
      if (!id) {
        if (code.trim().length < 4) throw new Error("Enter the room code your friend shared.");
        id = (await resolveJoinCode(code)).roomId;
      }
      await connect(id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className={styles.chooser}>
      <div className={styles.panel}>
        <h3><Users size={20} aria-hidden="true" /> Your name</h3>
        <p>Friends see this in the room. No account needed.</p>
        <div className={styles.field}>
          <label htmlFor="game-name">display name</label>
          <input id="game-name" className={styles.input} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
        </div>
        <button type="button" className={styles.btnGhost} onClick={onBack}>Back to modes</button>
      </div>

      <div className={styles.panel}>
        {invitedRoom ? (
          <>
            <h3><Link2 size={20} aria-hidden="true" /> You were invited</h3>
            <p>Join the {info.name} room your friend shared. Their link carries the room id.</p>
            <button type="button" className="button button-primary" onClick={() => join(invitedRoom)} disabled={busy !== null}>
              {busy === "join" ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              Join room
            </button>
          </>
        ) : (
          <>
            <h3><Wifi size={20} aria-hidden="true" /> Play with friends</h3>
            <p>{info.remoteDevices}. Create a room and share the link or code, or join one with a code.</p>
            <div className={styles.row} style={{ marginBottom: 18 }}>
              <button type="button" className="button button-primary" onClick={create} disabled={busy !== null}>
                {busy === "create" ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                Create a room
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void join(); }}>
              <div className={styles.field}>
                <label htmlFor="game-code">or join with a code</label>
                <input
                  id="game-code" className={`${styles.input} ${styles.code}`} value={code} maxLength={8} placeholder="ABC123"
                  onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false}
                />
              </div>
              <button type="submit" className={styles.btnGhost} disabled={busy !== null}>
                {busy === "join" ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : null} Join room
              </button>
            </form>
          </>
        )}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lobby bar

export function RoomLobby({ net, gameId, roomId, minPlayers, onLeave }: {
  net: GameNet; gameId: GameId; roomId: string; minPlayers: number; onLeave: () => void;
}) {
  const [peers, setPeers] = useState(net.peers);
  const [status, setStatus] = useState(net.status);
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const [message, setMessage] = useState("");
  const link = gameShareLink(gameId, roomId);

  useEffect(() => {
    const a = net.on("peers", setPeers);
    const b = net.on("status", setStatus);
    const c = net.on("error", setMessage);
    return () => { a(); b(); c(); };
  }, [net]);

  const connected = peers.filter((p) => p.connected);
  const everyoneReady = connected.length >= minPlayers && connected.every((p) => p.ready);
  const joinCode = net.room.joinCode;

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? joinCode : link);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage("Copying is blocked here. Select the code and copy it manually.");
    }
  }
  async function share() {
    try {
      await navigator.share({ title: "AI Box Games", text: `Join my ${GAMES[gameId].name} room`, url: link });
    } catch {
      /* cancelled */
    }
  }

  return (
    <section className={styles.lobby} aria-label="Online room">
      <div className={styles.codeBox}>
        <span>room code</span>
        <strong>{joinCode || "------"}</strong>
      </div>
      <div>
        <div className={styles.peers} aria-live="polite">
          {peers.length === 0 ? <span className={styles.peer}><Loader2 size={13} className={styles.spinner} aria-hidden="true" /> Connecting...</span> : null}
          {peers.map((p) => (
            <span key={p.id} className={styles.peer}>
              <i className={`${styles.dot} ${!p.connected ? styles.off : p.ready ? styles.on : ""}`} aria-hidden="true" />
              {p.name}{p.id === net.you ? " (you)" : ""}{p.role === "host" ? " / host" : ""}
              <span className={styles.srOnly}>{!p.connected ? "left" : p.ready ? "ready" : "not ready"}</span>
            </span>
          ))}
          <span className={styles.peer}>
            {status === "open" ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
            {status === "open" ? "online" : status === "connecting" ? "connecting" : "offline, retrying"}
          </span>
        </div>
        {message ? <p className={styles.info}>{message}</p> : null}
      </div>
      <div className={styles.lobbyActions}>
        <button type="button" className={styles.btnGhost} onClick={() => copy("code")}>
          {copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} Code
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => copy("link")}>
          {copied === "link" ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />} Link
        </button>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button type="button" className={styles.btnGhost} onClick={share}><Share2 size={16} aria-hidden="true" /> Invite</button>
        ) : null}
        {net.isHost ? (
          <button type="button" className="button button-primary" disabled={!everyoneReady} onClick={() => net.start()}>
            <Play size={16} aria-hidden="true" /> Start game
          </button>
        ) : (
          <span className={styles.peer}>{everyoneReady ? "Waiting for the host" : "Waiting for everyone"}</span>
        )}
        <button type="button" className={styles.btnGhost} onClick={onLeave}>Leave</button>
      </div>
    </section>
  );
}
