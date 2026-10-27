"use client";

import { Camera, CircleAlert, DoorClosed, Eye, Hourglass, Loader2, Lock, PartyPopper, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deviceId } from "../../../lib/room/hub-client";
import type { JoinRes, RoomSummary } from "../../../lib/room/protocol";
import { fetchRoomSummary, HubHttpError, joinRoom } from "../../../lib/room/session-http";
import type { LocalCamera } from "../../../lib/room/useLocalCamera";
import s from "./session.module.css";
import { StatePanel } from "./StatePanel";

const NAME_KEY = "aibox-room-name";
export const hostKeyStorage = (roomId: string) => `aibox-room-host:${roomId}`;

type Blocked = { kind: "full" | "completed" | "notfound" | "payment" | "error"; message?: string; resultId?: string | null };

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function JoinScreen({ roomId, camera, onJoined }: {
  roomId: string; camera: LocalCamera; onJoined: (res: JoinRes, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [isHost, setIsHost] = useState(false);
  const startedRef = useRef(false);
  const { start, stream, status, error, bindVideo } = camera;
  const videoRef = useRef<HTMLVideoElement>(null);

  // hostKey from ?k=, remembered name, room status, camera
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const url = new URL(window.location.href);
    const k = url.searchParams.get("k");
    if (k) {
      safeSet(hostKeyStorage(roomId), k);
      url.searchParams.delete("k");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    setIsHost(!!safeGet(hostKeyStorage(roomId)));
    setName(safeGet(NAME_KEY) ?? "");
    void start();
    fetchRoomSummary(roomId).then(
      (room) => {
        setSummary(room);
        if (room.status === "completed") setBlocked({ kind: "completed", resultId: room.resultId });
        else if (room.status === "pending_payment") setBlocked({ kind: "payment" });
      },
      (e) => {
        if (e instanceof HubHttpError && e.code === "ROOM_NOT_FOUND") setBlocked({ kind: "notfound" });
      },
    );
  }, [roomId, start]);

  useEffect(() => {
    const el = videoRef.current;
    bindVideo(el);
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    }
    return () => bindVideo(null);
  }, [bindVideo, stream, blocked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().slice(0, 24);
    if (!clean || busy || status !== "ready") return;
    setBusy(true);
    safeSet(NAME_KEY, clean);
    try {
      const res = await joinRoom(roomId, { name: clean, deviceId: deviceId(), hostKey: safeGet(hostKeyStorage(roomId)) ?? undefined });
      onJoined(res, clean);
    } catch (cause) {
      const code = cause instanceof HubHttpError ? cause.code : "INTERNAL";
      if (code === "ROOM_FULL") setBlocked({ kind: "full" });
      else if (code === "ROOM_COMPLETED") {
        const room = await fetchRoomSummary(roomId).catch(() => null);
        setBlocked({ kind: "completed", resultId: room?.resultId ?? summary?.resultId ?? null });
      } else if (code === "ROOM_NOT_FOUND") setBlocked({ kind: "notfound" });
      else if (code === "PAYMENT_REQUIRED") setBlocked({ kind: "payment" });
      else setBlocked({ kind: "error", message: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    const back = <Link className="button button-primary" href="/room">Create a room</Link>;
    const retry = <button className="button button-primary" onClick={() => setBlocked(null)}>Try again</button>;
    let panel;
    switch (blocked.kind) {
      case "full":
        panel = <StatePanel icon={Users} title="This room is full" actions={back}>All devices are already in this room. Ask the host to check the room, or start a new one.</StatePanel>;
        break;
      case "completed":
        panel = (
          <StatePanel icon={PartyPopper} title="This session has finished" actions={blocked.resultId ? <Link className="button button-primary" href={`/room/result/${blocked.resultId}`}>See the photostrip</Link> : back}>
            {blocked.resultId ? "The photostrip is ready to view and download." : "The photos from this room are no longer open for joining."}
          </StatePanel>
        );
        break;
      case "notfound":
        panel = <StatePanel icon={SearchX} title="We could not find this room" actions={back}>Check the link or join code, or ask the host to send it again.</StatePanel>;
        break;
      case "payment":
        panel = <StatePanel icon={Lock} title="This room is not open yet" actions={retry}>The host&apos;s payment is still pending. Once it is confirmed, this link will work.</StatePanel>;
        break;
      default:
        panel = <StatePanel icon={CircleAlert} title="Could not join the room" actions={retry}>{blocked.message ?? "Something went wrong. Please try again."}</StatePanel>;
    }
    return <div className={s.root}>{panel}</div>;
  }

  const camReady = status === "ready";
  return (
    <div className={s.root}>
      <div className={s.topTitle}>
        <div className="profile-eyebrow"><span />ai box room</div>
        <h1>{isHost ? "You are the host. Get ready." : "Join the photobox"}</h1>
      </div>
      <form className={s.join} onSubmit={submit}>
        <div className={s.preview}>
          <video ref={videoRef} className={`${s.video} ${s.mirror}`} autoPlay muted playsInline />
          {!stream && status !== "error" && (
            <div className={s.avatar}><Loader2 size={26} className={s.spin} aria-hidden="true" /><span>{status === "requesting" ? "Waiting for camera permission..." : "Starting camera..."}</span></div>
          )}
        </div>
        <div className={s.stack}>
          {status === "error" && (
            <div className={`${s.card} ${s.help}`} role="alert">
              <h2><Camera size={16} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Camera needed</h2>
              <p className={s.muted}>{error}</p>
              <ol>
                <li>Tap the lock or camera icon beside the address bar.</li>
                <li>Set Camera to Allow, then press the button below.</li>
                <li>Close other apps that may be using the camera.</li>
              </ol>
              <button type="button" className="button button-primary" onClick={() => void start()}>Try camera again</button>
            </div>
          )}
          <div className={s.card}>
            <label className={s.field}>
              <span className={s.label}>your name</span>
              <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="nickname" placeholder="e.g. Rani" required />
            </label>
            <p className={s.consent}><Eye size={16} aria-hidden="true" />Your photo will be visible to the people in this room.</p>
            <button className={`button button-primary ${s.big}`} type="submit" disabled={!name.trim() || !camReady || busy}>
              {busy ? <Loader2 size={18} className={s.spin} aria-hidden="true" /> : <DoorClosed size={18} aria-hidden="true" />}
              {busy ? "Joining..." : "Join room"}
            </button>
            {!camReady && status !== "error" && <p className={s.muted}><Hourglass size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Allow the camera to continue.</p>}
            <p className={s.muted}>Keep this page open during the session. Photos are taken on your own device at the same moment as everyone else.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
