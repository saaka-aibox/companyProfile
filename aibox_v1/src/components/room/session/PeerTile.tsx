"use client";

import { Check, UserPlus } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Peer } from "../../../lib/room/protocol";
import type { PeerLinkState } from "../../../lib/room/rtc";
import s from "./session.module.css";

type Props = {
  peer: Peer | null;
  isSelf?: boolean;
  stream?: MediaStream | null;
  bindVideo?: (el: HTMLVideoElement | null) => void;
  linkState?: PeerLinkState;
  peace?: boolean;
  ready?: boolean;
  /** Show ready check even when the peer is not flagged ready (kept for future use) */
  p2pDown?: boolean;
};

export function PeerTile({ peer, isSelf, stream, bindVideo, linkState, peace, ready, p2pDown }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== (stream ?? null)) el.srcObject = stream ?? null;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  useEffect(() => {
    if (!isSelf || !bindVideo) return;
    bindVideo(ref.current);
    return () => bindVideo(null);
  }, [isSelf, bindVideo, stream]);

  if (!peer) {
    return (
      <div className={`${s.tile} ${s.tileEmpty}`}>
        <span><UserPlus size={22} aria-hidden="true" />Waiting for a friend</span>
      </div>
    );
  }

  const online = peer.connected;
  const dot = !online ? s.statusOff : isSelf || linkState === "connected" ? s.statusOk : s.statusWarn;
  const dotLabel = !online ? "offline" : isSelf || linkState === "connected" ? "connected" : "video connecting";
  const hasVideo = !!stream;

  return (
    <div className={`${s.tile} ${isSelf ? s.tileSelf : ""} ${peace ? s.tilePeace : ""}`} aria-label={`${peer.name}${isSelf ? " (you)" : ""}, ${dotLabel}`}>
      <video ref={ref} className={`${s.video} ${isSelf ? s.mirror : ""}`} autoPlay muted playsInline hidden={!hasVideo} />
      {!hasVideo && (
        <div className={s.avatar}>
          <b aria-hidden="true">{(peer.name.trim()[0] || "?").toUpperCase()}</b>
          <span>{!online ? "Offline" : p2pDown || linkState === "failed" ? "Video unavailable" : "Connecting video"}</span>
        </div>
      )}
      <span className={`${s.status} ${dot}`} title={dotLabel} />
      <div className={s.badges}>
        {peace && <span className={`${s.badge} ${s.badgePeace}`} role="img" aria-label="Peace sign">✌</span>}
        {ready && <span className={`${s.badge} ${s.badgeReady}`} role="img" aria-label="Ready"><Check size={16} aria-hidden="true" /></span>}
      </div>
      <div className={s.tileLabel}><span>{peer.name}{isSelf ? " (you)" : ""}{peer.role === "host" ? " · host" : ""}</span></div>
    </div>
  );
}
