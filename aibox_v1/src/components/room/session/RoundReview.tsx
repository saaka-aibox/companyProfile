"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RoomFrameId } from "../../../lib/room/protocol";
import { buildRoundTile } from "../../../lib/room/session-compose";
import s from "./session.module.css";

/** Everyone sees this round's group tile, built on-device with buildGroupTile. */
export function RoundReview({ frameId, urls, tileKey }: { frameId: RoomFrameId | null; urls: string[]; tileKey: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<{ key: string; ok: boolean } | null>(null);
  const state = done?.key === tileKey ? (done.ok ? "ready" : "fallback") : "loading";

  useEffect(() => {
    let cancelled = false;
    const mount = hostRef.current;
    if (!frameId || urls.length === 0 || !mount) {
      Promise.resolve().then(() => !cancelled && setDone({ key: tileKey, ok: false }));
      return () => {
        cancelled = true;
      };
    }
    buildRoundTile(frameId, urls).then(
      (canvas) => {
        if (cancelled) return;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Group photo for this shot");
        mount.replaceChildren(canvas);
        setDone({ key: tileKey, ok: true });
      },
      () => !cancelled && setDone({ key: tileKey, ok: false }),
    );
    return () => {
      cancelled = true;
      mount.replaceChildren();
    };
    // urls is covered by tileKey (round + attempt + slots)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameId, tileKey]);

  return (
    <div className={s.reviewFrame}>
      <div ref={hostRef} style={{ display: state === "ready" ? "contents" : "none" }} />
      {state === "loading" && <span className={s.muted}><Loader2 size={18} className={s.spin} aria-hidden="true" style={{ verticalAlign: "-4px" }} /> Building the group shot...</span>}
      {state === "fallback" && (
        <div className={s.grid} style={{ width: "100%" }}>
          {urls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Participant photo" style={{ width: "100%", borderRadius: 4 }} />
          ))}
        </div>
      )}
    </div>
  );
}
