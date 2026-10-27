"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, DoorOpen, Loader2, Sparkles, Users } from "lucide-react";
import { captureFrames } from "../../landing/playground/visitor-photostrip";
import {
  createOrder, errorMessage, getCatalog, getRoom, hostKeyFromLink, saveHostKey, type Catalog,
} from "../../../lib/room/api";
import {
  PACKAGES, ROOM_FRAME_IDS, type CreateOrderRes, type OrderRes, type PackageId, type RoomFrameId,
} from "../../../lib/room/protocol";
import { CopyShare } from "../shared/CopyShare";
import { formatIdr } from "../shared/format";
import { PaymentPanel } from "../shared/PaymentPanel";
import { QrCode } from "../shared/QrCode";
import { FramePreview } from "./FramePreview";
import styles from "./create.module.css";

const PENDING_KEY = "aibox-room-pending-order";
type Pending = { order: CreateOrderRes; packageId: PackageId; frameId: RoomFrameId };

const FALLBACK: Catalog = {
  packages: [...PACKAGES],
  frames: [...ROOM_FRAME_IDS],
  aiStyles: [],
  aiAddonPrice: 10000,
  paymentMode: "mock",
};
const STEPS = ["Package", "Frame", "Pay", "Invite"] as const;

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    return p.order && p.order.expiresAt > Date.now() ? p : null;
  } catch {
    return null;
  }
}
function writePending(p: Pending | null) {
  try {
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function CreateWizard() {
  const [catalog, setCatalog] = useState<Catalog>(FALLBACK);
  const [offline, setOffline] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [packageId, setPackageId] = useState<PackageId>("squad");
  const [frameId, setFrameId] = useState<RoomFrameId>("songs");
  const [people, setPeople] = useState(4);
  const [order, setOrder] = useState<CreateOrderRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<{ roomId: string; hostKey: string; joinCode: string | null } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    getCatalog(ctrl.signal)
      .then((c) => {
        setCatalog(c);
        setOffline(false);
      })
      .catch((e) => {
        if (!(e instanceof DOMException)) setOffline(true);
      });
    // resume an unpaid order after a refresh (deferred so the first render matches SSR)
    queueMicrotask(() => {
      const pending = readPending();
      if (!pending || ctrl.signal.aborted) return;
      setOrder(pending.order);
      setPackageId(pending.packageId);
      setFrameId(pending.frameId);
      setStep(3);
    });
    return () => ctrl.abort();
  }, []);

  // move focus to the step heading after the first transition
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const pkg = useMemo(() => catalog.packages.find((p) => p.id === packageId) ?? catalog.packages[0], [catalog, packageId]);
  const frames = useMemo(
    () => catalog.frames.map((id) => captureFrames.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f),
    [catalog],
  );
  const frame = frames.find((f) => f.id === frameId) ?? frames[0];
  const maxPeople = pkg?.maxDevices ?? 4;
  const shownPeople = Math.min(people, maxPeople);

  const startPayment = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await createOrder({ kind: "room", packageId, frameId });
      setOrder(res);
      writePending({ order: res, packageId, frameId });
      setStep(3);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [packageId, frameId]);

  const onPaid = useCallback(async (res: OrderRes) => {
    writePending(null);
    const hostKey = hostKeyFromLink(res.hostLink);
    if (!res.roomId || !hostKey) {
      setError("Payment received, but the room link is missing. Contact support with your order details.");
      return;
    }
    saveHostKey(res.roomId, hostKey);
    setRoom({ roomId: res.roomId, hostKey, joinCode: null });
    setStep(4);
    try {
      const summary = await getRoom(res.roomId);
      setRoom((r) => (r ? { ...r, joinCode: summary.joinCode } : r));
    } catch {
      /* code is optional: the invite link still works */
    }
  }, []);

  const resetPayment = useCallback(() => {
    writePending(null);
    setOrder(null);
    setError("");
    setStep(2);
  }, []);

  const inviteUrl = room && typeof window !== "undefined" ? `${window.location.origin}/room/${room.roomId}` : "";

  return (
    <div className={styles.wizard} id="create">
      <ol className={styles.stepper} aria-label="Create a room">
        {STEPS.map((label, i) => (
          <li key={label} className={styles.stepItem} aria-current={step === i + 1 ? "step" : undefined} data-state={step > i + 1 ? "done" : step === i + 1 ? "now" : "todo"}>
            <span className={styles.stepNum}>{step > i + 1 ? <Check size={13} aria-hidden="true" /> : i + 1}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        ))}
      </ol>

      {offline && step < 3 && (
        <p className={styles.notice} role="status">Can&apos;t reach the room service right now, showing standard prices. You can still pick a plan.</p>
      )}

      {step === 1 && (
        <section aria-labelledby="step-1">
          <h2 id="step-1" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>Choose a package</h2>
          <p className={styles.stepLead}>You pay once. The room closes as soon as your strip is made.</p>
          <div className={styles.packages} role="radiogroup" aria-labelledby="step-1">
            {catalog.packages.map((p) => (
              <label key={p.id} className={styles.pkg} data-selected={p.id === packageId}>
                <input type="radio" name="package" value={p.id} checked={p.id === packageId} onChange={() => setPackageId(p.id)} className={styles.radio} />
                <span className={styles.pkgHead}>
                  <span className={styles.pkgName}>{p.name}</span>
                  {p.id === "squad" && <span className={styles.badge}>popular</span>}
                </span>
                <span className={styles.pkgPrice}>{formatIdr(p.price)}</span>
                <span className={styles.pkgBlurb}>{p.blurb}</span>
                <ul className={styles.pkgList}>
                  <li><Users size={14} aria-hidden="true" /> Up to {p.maxDevices} devices</li>
                  <li><Check size={14} aria-hidden="true" /> 1 shared photostrip, 4 shots</li>
                  {p.aiCredits > 0 && <li><Sparkles size={14} aria-hidden="true" /> {p.aiCredits} AI style included</li>}
                </ul>
              </label>
            ))}
          </div>
          <div className={styles.navRow}>
            <button type="button" className="button button-primary" onClick={() => { setPeople((n) => Math.min(n, maxPeople)); setStep(2); }}>
              Continue <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {step === 2 && frame && (
        <section aria-labelledby="step-2">
          <h2 id="step-2" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>Pick a frame</h2>
          <p className={styles.stepLead}>Everyone appears together in every shot. See how {Math.min(2, maxPeople)} to {maxPeople} people fill it.</p>
          <div className={styles.frameLayout}>
            <div className={styles.frameChoices}>
              <div className={styles.frames} role="radiogroup" aria-label="Frame">
                {frames.map((f) => (
                  <label key={f.id} className={styles.frameCard} data-selected={f.id === frameId}>
                    <input type="radio" name="frame" value={f.id} checked={f.id === frameId} onChange={() => setFrameId(f.id as RoomFrameId)} className={styles.radio} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.src} alt="" loading="lazy" className={styles.frameThumb} />
                    <span className={styles.frameName}>{f.name}</span>
                  </label>
                ))}
              </div>
              <fieldset className={styles.segment}>
                <legend className="profile-micro">people per shot</legend>
                <div className={styles.segmentRow}>
                  {[2, 3, 4].filter((n) => n <= maxPeople).map((n) => (
                    <label key={n} className={styles.segmentItem} data-selected={n === shownPeople}>
                      <input type="radio" name="people" value={n} checked={n === shownPeople} onChange={() => setPeople(n)} className={styles.radio} />
                      {n}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={styles.summary}>
                <span className="profile-micro">your order</span>
                <strong>{pkg.name}</strong>
                <span>{formatIdr(pkg.price)}</span>
              </div>
            </div>
            <FramePreview frameId={frame.id as RoomFrameId} people={shownPeople} frameName={frame.name} />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.navRow}>
            <button type="button" className="button profile-button-outline" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="button button-primary" onClick={startPayment} disabled={busy}>
              {busy ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : null}
              {busy ? "Creating payment..." : `Pay ${formatIdr(pkg.price)}`}
              {!busy && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </section>
      )}

      {step === 3 && order && (
        <section aria-labelledby="step-3">
          <h2 id="step-3" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>Pay with QRIS</h2>
          <p className={styles.stepLead}>{pkg.name} with the {frame?.name ?? "selected"} frame.</p>
          <PaymentPanel order={order} onPaid={onPaid} onExpired={resetPayment} />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.navRow}>
            <button type="button" className="button profile-button-outline" onClick={resetPayment}>Change package or frame</button>
          </div>
        </section>
      )}

      {step === 4 && room && (
        <section aria-labelledby="step-4">
          <h2 id="step-4" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>Your room is ready</h2>
          <p className={styles.stepLead}>Share the code or link. Friends join without paying or signing up.</p>
          <div className={styles.invite}>
            <div className={styles.inviteMain}>
              <p className="profile-micro">join code</p>
              <p className={styles.code} aria-label={room.joinCode ? `Join code ${room.joinCode.split("").join(" ")}` : "Join code loading"}>
                {room.joinCode ?? "......"}
              </p>
              <label className={styles.linkLabel}>
                <span className="profile-micro">invite link</span>
                <input className={styles.linkInput} readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <CopyShare url={inviteUrl} title="Join my AI Box Room" text={`Join my photo room${room.joinCode ? ` with code ${room.joinCode}` : ""}.`} />
              <Link className="button button-primary" href={`/room/${room.roomId}?k=${encodeURIComponent(room.hostKey)}`}>
                <DoorOpen size={16} aria-hidden="true" /> Enter room as host
              </Link>
              <p className={styles.muted}>Keep this browser: your host key is saved here. The host link also works on another device.</p>
            </div>
            <div className={styles.inviteQr}>
              <QrCode value={inviteUrl} label="QR code for the room invite link" />
              <span className="profile-micro">scan to join</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
