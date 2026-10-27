"use client";

import Link from "next/link";
import { ArrowUpRight, Download, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GAMES, type GameId } from "../../lib/games/catalog";
import type { GameResult } from "../../lib/games/engine";
import {
  STRIP_MIN_FRAMES, canvasToBlob, composeMomentCard, composeStripMoment, downloadBlob, shareBlob,
} from "../../lib/games/photo-moment";
import styles from "./games.module.css";

type Props = {
  gameId: GameId;
  result: GameResult;
  remote: boolean;
  isHost: boolean;
  onAgain: () => void;
  onExit: () => void;
};

export function ResultScreen({ gameId, result, remote, isHost, onAgain, onExit }: Props) {
  const info = GAMES[gameId];
  const [view, setView] = useState<"card" | "strip">("card");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const blobs = useRef<{ card?: Blob; strip?: Blob }>({});
  const canStrip = result.burst.length >= STRIP_MIN_FRAMES;

  // game card
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const canvas = composeMomentCard({
      game: info.name,
      headline: result.title,
      subline: result.subtitle,
      stamp: result.stamp,
      stats: result.stats,
      photo: result.photo,
      split: result.split ?? null,
      drawOverlay: result.drawOverlay,
    });
    canvasToBlob(canvas, "image/jpeg", 0.92)
      .then((b) => {
        if (cancelled) return;
        blobs.current.card = b;
        url = URL.createObjectURL(b);
        setCardUrl(url);
      })
      .catch(() => setMessage("The photo card could not be created. You can still play again."));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [info.name, result]);

  // photostrip variant (built lazily)
  useEffect(() => {
    if (view !== "strip" || stripUrl || !canStrip) return;
    let cancelled = false;
    composeStripMoment(result.burst)
      .then(async (u) => {
        if (cancelled) { URL.revokeObjectURL(u); return; }
        blobs.current.strip = await (await fetch(u)).blob();
        setStripUrl(u);
      })
      .catch(() => { setMessage("The photostrip could not be created."); setView("card"); });
    return () => { cancelled = true; };
  }, [view, stripUrl, canStrip, result.burst]);

  useEffect(() => () => { if (stripUrl) URL.revokeObjectURL(stripUrl); }, [stripUrl]);

  const current = view === "strip" ? stripUrl : cardUrl;
  const fileName = `aibox-${gameId}-${view === "strip" ? "strip" : "moment"}`;

  async function download() {
    const blob = view === "strip" ? blobs.current.strip : blobs.current.card;
    if (!blob) return;
    if (view === "strip") {
      // the strip is a PNG; convert through the same blob type
      downloadBlob(blob, `${fileName}.png`);
    } else downloadBlob(blob, `${fileName}.jpg`);
    setMessage("Saved to your downloads.");
  }

  async function share() {
    const blob = view === "strip" ? blobs.current.strip : blobs.current.card;
    if (!blob) return;
    const out = await shareBlob(blob, `${fileName}.${view === "strip" ? "png" : "jpg"}`, `${result.title} - AI Box Games`);
    if (out === "unsupported") {
      await download();
      setMessage("Sharing is not available here, so the photo was saved instead.");
    } else if (out === "shared") setMessage("Shared.");
  }

  return (
    <div className={styles.result}>
      <div className={styles.resultMedia}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            className={`${styles.resultImg} ${view === "strip" ? styles.strip : ""}`}
            alt={`${info.name} photo moment: ${result.title}. ${result.subtitle}`}
          />
        ) : (
          <div className={styles.resultImg} aria-busy="true" />
        )}
        <div className={styles.segmented} role="group" aria-label="Photo format">
          <button type="button" aria-pressed={view === "card"} onClick={() => setView("card")}>game card</button>
          <button
            type="button"
            aria-pressed={view === "strip"}
            disabled={!canStrip}
            title={canStrip ? "Four recent camera frames in an AI Box photostrip" : "Not enough camera frames for a photostrip"}
            onClick={() => setView("strip")}
          >
            photostrip
          </button>
        </div>
      </div>

      <div className={styles.resultCopy}>
        <p className="profile-eyebrow"><span />{info.name.toLowerCase()} / result</p>
        <h2>{result.title}</h2>
        <p>{result.subtitle}</p>
        <div className={styles.stats}>
          {result.stats.map((s) => (
            <div key={s.label} className={styles.stat}><span>{s.label}</span><strong>{s.value}</strong></div>
          ))}
        </div>
        {result.ranking?.length ? (
          <ol className={styles.ranking} aria-label="Ranking">
            {result.ranking.map((r, i) => (
              <li key={`${r.name}-${i}`} className={r.me ? styles.me : undefined}>
                <span>{i + 1}. {r.name}{r.me ? " (you)" : ""}</span><b>{r.score}</b>
              </li>
            ))}
          </ol>
        ) : null}
        <div className={styles.btnRow}>
          <button type="button" className="button button-primary" onClick={download} disabled={!current}>
            <Download size={16} aria-hidden="true" /> Download
          </button>
          <button type="button" className={styles.btnGhost} onClick={share} disabled={!current}>
            <Share2 size={16} aria-hidden="true" /> Share
          </button>
          <button type="button" className={styles.btnGhost} onClick={onAgain}>
            <RotateCcw size={16} aria-hidden="true" /> {remote ? (isHost ? "Rematch" : "Ready for a rematch") : "Play again"}
          </button>
        </div>
        <div className={styles.btnRow} style={{ marginTop: 10 }}>
          <Link className={styles.btnGhost} href="/room">Try AI Box Room <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <button type="button" className={styles.btnGhost} onClick={onExit}>All games</button>
        </div>
        <p className={styles.toast} role="status">{message}</p>
      </div>
    </div>
  );
}
