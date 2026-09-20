"use client";

import { useEffect, useState } from "react";

type GestureStatus = { running: boolean; error: string | null };
const initialStatus: GestureStatus = { running: false, error: null };

export function GestureControl() {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => {
      void fetch("/api/gesture/status").then((response) => response.json()).then(setStatus).catch(() => setStatus({ running: false, error: "Local bridge unavailable." }));
    };
    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function toggleGesture() {
    setBusy(true);
    try {
      const response = await fetch(`/api/gesture/${status.running ? "stop" : "start"}`, { method: "POST" });
      const nextStatus = (await response.json()) as GestureStatus;
      if (!response.ok) throw new Error(nextStatus.error ?? "Could not start gesture control.");
      setStatus(nextStatus);
    } catch (error) {
      setStatus({ running: false, error: error instanceof Error ? error.message : "Gesture control failed." });
    } finally {
      setBusy(false);
    }
  }

  return <div className="gesture-control"><div className={`gesture-status ${status.running ? "is-active" : ""}`}><span />{status.running ? "Gesture control active" : "Gesture control inactive"}</div><button className="button button-outline" onClick={toggleGesture} disabled={busy}>{busy ? "Connecting..." : status.running ? "Deactivate control" : "Activate gesture control"}</button>{status.error && <small>{status.error}</small>}</div>;
}
