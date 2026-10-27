"use client";

import { useMemo } from "react";
import { qrMatrix } from "../../../lib/room/qr";
import styles from "./shared.module.css";

/** Dark-on-white QR (always high contrast, in both themes). Pure SVG, no dependencies. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const model = useMemo(() => {
    try {
      const m = qrMatrix(value);
      const q = 4;
      const n = m.length + q * 2;
      let d = "";
      m.forEach((row, y) =>
        row.forEach((dark, x) => {
          if (dark) d += `M${x + q} ${y + q}h1v1h-1z`;
        }),
      );
      return { n, d };
    } catch {
      return null;
    }
  }, [value]);
  if (!model) return <p className={styles.muted}>QR unavailable. Use the link instead.</p>;
  return (
    <svg
      className={`${styles.qr} ${className ?? ""}`}
      viewBox={`0 0 ${model.n} ${model.n}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={model.n} height={model.n} fill="#fff" />
      <path d={model.d} fill="#0b0d10" />
    </svg>
  );
}
