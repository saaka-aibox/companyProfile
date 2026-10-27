"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, FlaskConical, Loader2, Sparkles } from "lucide-react";
import {
  addVariant, createOrder, errorMessage, getAiJob, getCatalog, getResult, isApiError, putToPresigned,
  requestUpload, startAiJob,
} from "../../../lib/room/api";
import {
  buildGroupTile, canvasToBlob, composeRoomStrip, loadImage, sliceGrid, stitchGrid, tileSizeFor,
} from "../../../lib/room/compose";
import { AI_ADDON_PRICE, ROUNDS, type AiStyle, type CreateOrderRes, type ResultRes } from "../../../lib/room/protocol";
import { formatIdr } from "../shared/format";
import { PaymentPanel } from "../shared/PaymentPanel";
import { AI_STYLE_META, AI_STYLE_ORDER } from "./ai-styles";
import styles from "./result.module.css";

type Phase = "idle" | "prepare" | "upload" | "queue" | "compose" | "save" | "done" | "error";
const PHASES: { id: Exclude<Phase, "idle" | "done" | "error">; label: string }[] = [
  { id: "prepare", label: "Rebuilding your group photos" },
  { id: "upload", label: "Sending them to the AI studio" },
  { id: "queue", label: "Restyling (usually under a minute)" },
  { id: "compose", label: "Placing the new look into your frame" },
  { id: "save", label: "Saving the new version" },
];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Rebuilds the 4 group tiles from the accepted stills (same layout as the live session). */
async function rebuildTiles(result: ResultRes) {
  const tile = tileSizeFor(result.frameId);
  const slots = [...new Set(result.stills.map((s) => s.slot))].sort((a, b) => a - b);
  if (!slots.length) throw new Error("This result has no saved photos to restyle.");
  const urls = [...new Set(result.stills.map((s) => s.url))];
  const loaded = new Map<string, HTMLImageElement>();
  await Promise.all(urls.map(async (u) => loaded.set(u, await loadImage(u))));
  const names = slots.map((s) => (s === 0 ? "Host" : `Guest ${s}`));
  const tiles = Array.from({ length: ROUNDS }, (_, round) =>
    buildGroupTile(
      slots.map((slot) => {
        const st = result.stills.find((s) => s.round === round && s.slot === slot);
        return st ? (loaded.get(st.url) ?? null) : null;
      }),
      tile.width,
      tile.height,
      { names },
    ),
  );
  return { tile, tiles };
}

export function AiEditor({ result, hostKey, onResult }: { result: ResultRes; hostKey: string; onResult: (r: ResultRes) => void }) {
  const [style, setStyle] = useState<AiStyle>("ghibli");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [addonPrice, setAddonPrice] = useState(AI_ADDON_PRICE);
  const [offerAddon, setOfferAddon] = useState(false);
  const [addonOrder, setAddonOrder] = useState<CreateOrderRes | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const resultRef = useRef(result);
  useEffect(() => {
    resultRef.current = result;
  });
  useEffect(() => {
    alive.current = true;
    getCatalog().then((c) => alive.current && setAddonPrice(c.aiAddonPrice)).catch(() => {});
    return () => {
      alive.current = false;
    };
  }, []);

  const running = phase !== "idle" && phase !== "done" && phase !== "error";

  const run = useCallback(async (chosen: AiStyle, res: ResultRes) => {
    setError("");
    setOfferAddon(false);
    setAddonOrder(null);
    try {
      setPhase("prepare");
      const { tile, tiles } = await rebuildTiles(res);
      const grid = stitchGrid(tiles);
      const gridBlob = await canvasToBlob(grid, "image/jpeg", 0.9);

      setPhase("upload");
      const up = await requestUpload(res.id, hostKey, "ai_input");
      await putToPresigned(up, gridBlob);

      setPhase("queue");
      let job = await startAiJob(res.id, hostKey, { style: chosen, inputKey: up.key });
      setMock(job.mock);
      for (let i = 0; job.status !== "done" && job.status !== "failed"; i++) {
        if (i > 120) throw new Error("The AI is taking longer than expected. Please try again in a minute.");
        await delay(2000);
        if (!alive.current) return;
        job = await getAiJob(job.jobId);
        setMock(job.mock);
      }
      if (job.status === "failed" || !job.outputUrl) throw new Error(job.error || "The AI couldn't restyle this strip.");

      setPhase("compose");
      const out = await loadImage(job.outputUrl);
      const composed = await composeRoomStrip(res.frameId, sliceGrid(out, ROUNDS, tile));
      URL.revokeObjectURL(composed.preview);

      setPhase("save");
      const vUp = await requestUpload(res.id, hostKey, "variant");
      await putToPresigned(vUp, composed.final);
      const updated = await addVariant(res.id, hostKey, { jobId: job.jobId, key: vUp.key });
      if (!alive.current) return;
      setPhase("done");
      onResult(updated);
    } catch (e) {
      if (!alive.current) return;
      if (isApiError(e, "PAYMENT_REQUIRED")) {
        setPhase("idle");
        setOfferAddon(true);
        return;
      }
      setPhase("error");
      setError(errorMessage(e));
    }
  }, [hostKey, onResult]);

  function submit() {
    if (running) return;
    if (result.aiCreditsLeft <= 0) {
      setOfferAddon(true);
      return;
    }
    void run(style, result);
  }

  async function buyAddon() {
    setBusy(true);
    setError("");
    try {
      setAddonOrder(await createOrder({ kind: "ai_addon", resultId: result.id }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function afterPaid() {
    setAddonOrder(null);
    try {
      let fresh = await getResult(result.id);
      for (let i = 0; i < 4 && fresh.aiCreditsLeft <= 0; i++) {
        await delay(1000);
        fresh = await getResult(result.id);
      }
      if (!alive.current) return;
      onResult(fresh);
      if (fresh.aiCreditsLeft > 0) void run(style, fresh);
      else setError("Payment received. Your AI credit is still being applied, try again in a moment.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const phaseIndex = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className={styles.ai}>
      <div className={styles.aiHead}>
        <div>
          <p className="profile-micro">host only</p>
          <h3 className={styles.aiTitle}><Sparkles size={20} aria-hidden="true" /> Edit with AI</h3>
        </div>
        <span className={styles.credit} data-empty={result.aiCreditsLeft <= 0}>
          {result.aiCreditsLeft} AI {result.aiCreditsLeft === 1 ? "credit" : "credits"}
        </span>
      </div>

      <fieldset className={styles.styleSet} disabled={running}>
        <legend className={styles.srOnly}>Choose an AI style</legend>
        <div className={styles.styleGrid}>
          {AI_STYLE_ORDER.map((s) => (
            <label key={s} className={styles.styleCard} data-selected={s === style}>
              <input type="radio" name="ai-style" className={styles.radio} checked={s === style} onChange={() => setStyle(s)} />
              <span className={styles.swatch} style={{ background: AI_STYLE_META[s].swatch }} aria-hidden="true" />
              <span className={styles.styleName}>{AI_STYLE_META[s].name}</span>
              <span className={styles.styleBlurb}>{AI_STYLE_META[s].blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!offerAddon && (
        <button type="button" className="button button-primary" onClick={submit} disabled={running}>
          {running ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {running ? "Working..." : `Restyle as ${AI_STYLE_META[style].name}`}
        </button>
      )}

      {offerAddon && !addonOrder && (
        <div className={styles.addon}>
          <p><strong>No AI credits left.</strong> Add one AI style for {formatIdr(addonPrice)} and we&apos;ll start right after payment.</p>
          <div className={styles.row}>
            <button type="button" className="button button-primary" onClick={buyAddon} disabled={busy}>
              {busy && <Loader2 size={16} className={styles.spin} aria-hidden="true" />} Add AI for {formatIdr(addonPrice)}
            </button>
            <button type="button" className="button profile-button-outline" onClick={() => setOfferAddon(false)}>Not now</button>
          </div>
        </div>
      )}
      {addonOrder && (
        <div className={styles.addon}>
          <PaymentPanel order={addonOrder} title="AI add-on / scan to pay" onPaid={afterPaid} onExpired={() => setAddonOrder(null)} />
        </div>
      )}

      <div className={styles.progress} role="status" aria-live="polite">
        {running && (
          <ol className={styles.steps}>
            {PHASES.map((p, i) => (
              <li key={p.id} data-state={i < phaseIndex ? "done" : i === phaseIndex ? "now" : "todo"}>
                {i < phaseIndex ? <Check size={14} aria-hidden="true" /> : i === phaseIndex ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <span className={styles.dot} aria-hidden="true" />}
                {p.label}
              </li>
            ))}
          </ol>
        )}
        {phase === "done" && <p className={styles.okText}><Check size={15} aria-hidden="true" /> Your new look is ready. Pick it in the preview above.</p>}
      </div>
      {error && (
        <p className={styles.errorText} role="alert"><AlertCircle size={15} aria-hidden="true" /> {error}</p>
      )}
      {mock && (
        <p className={styles.demoNote}><FlaskConical size={12} aria-hidden="true" /> demo mode: the AI step returns your original photos</p>
      )}
    </div>
  );
}
