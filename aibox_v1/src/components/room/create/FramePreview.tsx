"use client";

import { useEffect, useState } from "react";
import { buildGroupTile, composeRoomStrip, tileSizeFor } from "../../../lib/room/compose";
import type { RoomFrameId } from "../../../lib/room/protocol";
import { placeholderStill } from "./placeholders";
import styles from "./create.module.css";

/** Live preview of a frame filled with generated group tiles for `people` participants. */
export function FramePreview({ frameId, people, frameName }: { frameId: RoomFrameId; people: number; frameName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    const timer = setTimeout(async () => {
      try {
        const { width, height } = tileSizeFor(frameId);
        const stills = Array.from({ length: people }, (_, i) => placeholderStill(i));
        const tiles = Array.from({ length: 4 }, (_, round) =>
          // rotate who is first so the four shots do not look identical
          buildGroupTile(stills.map((_, k) => stills[(k + round) % stills.length]), width, height, {
            names: ["Host", "Guest 1", "Guest 2", "Guest 3"],
          }),
        );
        const { preview } = await composeRoomStrip(frameId, tiles);
        made = preview;
        if (cancelled) {
          URL.revokeObjectURL(preview);
          return;
        }
        setUrl(preview);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (made) URL.revokeObjectURL(made);
    };
  }, [frameId, people]);

  return (
    <figure className={styles.previewFigure}>
      <div className={styles.previewStage} aria-busy={!url && !failed}>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${frameName} frame filled with ${people} people per shot`} className={styles.previewImg} />
        )}
        {!url && !failed && <span className={styles.previewSkeleton} aria-hidden="true" />}
        {failed && <span className={styles.muted}>Preview unavailable.</span>}
      </div>
      <figcaption className="profile-micro">preview / {people} people per shot</figcaption>
    </figure>
  );
}
