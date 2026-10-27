"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FlaskConical, Loader2 } from "lucide-react";
import { errorMessage, getOrder, mockPayOrder } from "../../../lib/room/api";
import type { CreateOrderRes, OrderRes } from "../../../lib/room/protocol";
import { formatClock, formatIdr } from "./format";
import { QrCode } from "./QrCode";
import styles from "./shared.module.css";

const POLL_MS = 3000;

/**
 * QRIS payment: QR, 15-minute countdown, 3 s status polling (paused while the tab is hidden)
 * and a dev-only "Simulate payment" button when the hub runs in mock mode.
 */
export function PaymentPanel({
  order,
  title = "Scan to pay with QRIS",
  onPaid,
  onExpired,
}: {
  order: CreateOrderRes;
  title?: string;
  onPaid: (res: OrderRes) => void;
  onExpired: () => void;
}) {
  const [left, setLeft] = useState(() => Math.max(0, order.expiresAt - Date.now()));
  const [status, setStatus] = useState<"waiting" | "paid" | "expired">("waiting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fails = useRef(0);
  const done = useRef(false);
  const onPaidRef = useRef(onPaid);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onPaidRef.current = onPaid;
    onExpiredRef.current = onExpired;
  });

  const finish = useCallback((res: OrderRes) => {
    if (done.current) return;
    if (res.status === "PAID") {
      done.current = true;
      setStatus("paid");
      onPaidRef.current(res);
    } else if (res.status === "EXPIRED" || res.status === "REFUNDED") {
      done.current = true;
      setStatus("expired");
    }
  }, []);

  // countdown
  useEffect(() => {
    const id = setInterval(() => {
      const ms = Math.max(0, order.expiresAt - Date.now());
      setLeft(ms);
      if (ms <= 0 && !done.current) {
        done.current = true;
        setStatus("expired");
      }
    }, 500);
    return () => clearInterval(id);
  }, [order.expiresAt]);

  // polling, paused while hidden
  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      if (done.current) return;
      try {
        finish(await getOrder(order.orderId, order.orderToken, ctrl.signal));
        fails.current = 0;
        setError("");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (++fails.current >= 3) setError(errorMessage(e));
      }
    };
    const start = () => {
      if (timer) return;
      void tick();
      timer = setInterval(tick, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      ctrl.abort();
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [order.orderId, order.orderToken, finish]);

  async function simulate() {
    setBusy(true);
    setError("");
    try {
      finish(await mockPayOrder(order.orderId, order.orderToken));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const live = status === "paid" ? "Payment received." : status === "expired" ? "This payment has expired." : "Waiting for payment.";
  return (
    <div className={styles.pay}>
      <div className={styles.payQr}>
        {status === "expired" ? (
          <div className={styles.payExpired}>
            <AlertCircle size={28} aria-hidden="true" />
            <strong>QR expired</strong>
            <span>Start a new payment to continue.</span>
          </div>
        ) : (
          <QrCode value={order.qrString} label={`QRIS payment code for ${formatIdr(order.amount)}`} />
        )}
      </div>
      <div className={styles.payInfo}>
        <p className="profile-micro">{title}</p>
        <p className={styles.amount}>{formatIdr(order.amount)}</p>
        <p className={styles.timer} role="timer">
          <Clock size={15} aria-hidden="true" />
          <span>{status === "expired" ? "0:00" : formatClock(left)}</span>
          <span className={styles.muted}>left to pay</span>
        </p>
        <p className={styles.payStatus} data-state={status} role="status" aria-live="polite">
          {status === "waiting" && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
          {status === "paid" && <CheckCircle2 size={16} aria-hidden="true" />}
          {status === "expired" && <AlertCircle size={16} aria-hidden="true" />}
          {live}
        </p>
        {error && <p className={styles.errorText} role="alert">{error}</p>}
        <p className={styles.muted}>Open any e-wallet or mobile banking app that supports QRIS. This page updates by itself once the payment lands.</p>
        {order.mock && status === "waiting" && (
          <button type="button" className="button profile-button-ink" onClick={simulate} disabled={busy}>
            <FlaskConical size={16} aria-hidden="true" /> {busy ? "Simulating..." : "Simulate payment (dev)"}
          </button>
        )}
        {order.mock && <p className={styles.demoNote}>Demo mode: no real money moves.</p>}
        {status === "expired" && (
          <button type="button" className="button button-primary" onClick={() => onExpiredRef.current()}>
            Start a new payment
          </button>
        )}
      </div>
    </div>
  );
}
