"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarClock, Download, ImageDown, Loader2, Trash2 } from "lucide-react";
import { deleteResult, errorMessage, forgetHostKey, getHostKey, getResult } from "../../../lib/room/api";
import type { ResultRes } from "../../../lib/room/protocol";
import { Eyebrow } from "../../landing/profile/ProfileSections";
import { CopyShare } from "../shared/CopyShare";
import { formatDate } from "../shared/format";
import { QrCode } from "../shared/QrCode";
import { AiEditor } from "./AiEditor";
import { AI_STYLE_META } from "./ai-styles";
import { downloadFile } from "./download";
import styles from "./result.module.css";

type Load = { state: "loading" } | { state: "error"; message: string; gone: boolean } | { state: "ready"; result: ResultRes };

export function ResultView({ resultId }: { resultId: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [active, setActive] = useState("original");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    getResult(resultId, ctrl.signal)
      .then((result) => {
        setLoad({ state: "ready", result });
        setHostKey(getHostKey(result.roomId));
      })
      .catch((e) => {
        if (e instanceof DOMException) return;
        const code = (e as { code?: string }).code;
        setLoad({
          state: "error",
          gone: code === "NOT_FOUND" || code === "ROOM_NOT_FOUND" || (e as { status?: number }).status === 404,
          message: errorMessage(e),
        });
      });
    return () => ctrl.abort();
  }, [resultId]);

  const onResult = useCallback((r: ResultRes) => {
    setLoad({ state: "ready", result: r });
    const newest = r.variants[r.variants.length - 1];
    if (newest) setActive(newest.id);
  }, []);

  async function remove(result: ResultRes) {
    if (!hostKey) return;
    setDeleting(true);
    setError("");
    try {
      await deleteResult(result.id, hostKey);
      forgetHostKey(result.roomId);
      setDeleted(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  if (load.state === "loading") {
    return (
      <section className={`profile-container ${styles.page}`} aria-busy="true">
        <p className={styles.loading} role="status"><Loader2 size={18} className={styles.spin} aria-hidden="true" /> Loading your strip...</p>
      </section>
    );
  }
  if (load.state === "error" || deleted) {
    return (
      <section className={`profile-container ${styles.page}`}>
        <div className={styles.empty}>
          <AlertCircle size={28} aria-hidden="true" />
          <h1>{deleted ? "Strip deleted" : load.state === "error" && load.gone ? "This strip is gone" : "We couldn't load this strip"}</h1>
          <p>
            {deleted
              ? "The strip, its photos and AI versions were removed from our servers."
              : load.state === "error" && load.gone
                ? "It was deleted or its 30 days are over."
                : load.state === "error" ? load.message : ""}
          </p>
          <Link className="button button-primary" href="/room">Start a new room</Link>
        </div>
      </section>
    );
  }

  const { result } = load;
  const variant = result.variants.find((v) => v.id === active);
  const shownUrl = variant ? variant.url : result.finalUrl;
  const shownLabel = variant ? AI_STYLE_META[variant.style].name : "Original";
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/room/result/${result.id}` : "";

  return (
    <section className={`profile-container ${styles.page}`} aria-labelledby="result-title">
      <div className="profile-page-index">
        <Eyebrow>ai box room</Eyebrow>
        <span>your photostrip</span>
      </div>
      <h1 id="result-title" className={styles.title}>Here&apos;s your strip.</h1>

      <div className={styles.layout}>
        <div className={styles.stageCol}>
          <div className={styles.stage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={shownUrl} src={shownUrl} alt={`Photostrip, ${shownLabel} version`} className={styles.stageImg} />
          </div>
          <div className={styles.variants} role="group" aria-label="Versions">
            <button type="button" className={styles.variant} aria-pressed={active === "original"} onClick={() => setActive("original")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.thumbUrl} alt="" />
              <span>Original</span>
            </button>
            {result.variants.map((v) => (
              <button key={v.id} type="button" className={styles.variant} aria-pressed={active === v.id} onClick={() => setActive(v.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.url} alt="" loading="lazy" />
                <span>{AI_STYLE_META[v.style].name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.side}>
          <div className={styles.card}>
            <p className="profile-micro">{shownLabel} version</p>
            <div className={styles.row}>
              <button type="button" className="button button-primary" onClick={() => downloadFile(shownUrl, `aibox-room-${variant ? variant.style : "strip"}.jpg`)}>
                <Download size={16} aria-hidden="true" /> Download strip
              </button>
            </div>
            <CopyShare url={pageUrl} title="Our AI Box Room strip" text="Look at our photostrip." />
            <p className={styles.expiry}>
              <CalendarClock size={15} aria-hidden="true" />
              <span>Kept until <strong>{formatDate(result.deleteAt)}</strong>, then deleted automatically.</span>
            </p>
          </div>

          <div className={`${styles.card} ${styles.qrCard}`}>
            <div className={styles.qrBox}><QrCode value={pageUrl} label="QR code for this result page" /></div>
            <div>
              <p className="profile-micro">send to a phone</p>
              <p className={styles.muted}>Scan to open this page and save the strip.</p>
            </div>
          </div>

          {result.stills.length > 0 && (
            <div className={styles.card}>
              <p className="profile-micro">individual photos ({result.stills.length})</p>
              <ul className={styles.stills}>
                {[...result.stills].sort((a, b) => a.round - b.round || a.slot - b.slot).map((s) => (
                  <li key={`${s.round}-${s.slot}`}>
                    <button type="button" className={styles.still} onClick={() => downloadFile(s.url, `aibox-room-r${s.round + 1}-p${s.slot + 1}.jpg`)} aria-label={`Download photo, shot ${s.round + 1}, person ${s.slot + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.url} alt="" loading="lazy" />
                      <ImageDown size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {hostKey ? (
        <div className={styles.hostZone}>
          <AiEditor result={result} hostKey={hostKey} onResult={onResult} />
          <div className={styles.danger}>
            <div>
              <p className="profile-micro">host controls</p>
              <p className={styles.muted}>Delete the strip, every photo and all AI versions right now. This can&apos;t be undone.</p>
            </div>
            {!confirmDelete ? (
              <button type="button" className="button profile-button-outline" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} aria-hidden="true" /> Delete now
              </button>
            ) : (
              <div className={styles.row} role="alertdialog" aria-label="Confirm deletion">
                <button type="button" className={`button ${styles.dangerBtn}`} onClick={() => remove(result)} disabled={deleting}>
                  {deleting ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                  Yes, delete everything
                </button>
                <button type="button" className="button profile-button-outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Keep it</button>
              </div>
            )}
            {error && <p className={styles.errorText} role="alert">{error}</p>}
          </div>
        </div>
      ) : (
        <p className={styles.hostHint}>Only the host of this room can edit with AI or delete the strip. Open this page in the browser the host used to create the room.</p>
      )}

      <div className={styles.again}>
        <Link className="profile-text-link" href="/room">Make another strip</Link>
      </div>
    </section>
  );
}
