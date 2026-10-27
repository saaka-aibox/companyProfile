import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import s from "./session.module.css";

/** Friendly full-card state (room full, finished, not found, ...). */
export function StatePanel({ icon: Icon, title, children, actions, spin, celebrate }: {
  icon: LucideIcon; title: string; children?: ReactNode; actions?: ReactNode; spin?: boolean; celebrate?: boolean;
}) {
  return (
    <section className={`${s.card} ${s.center}`} role="status" aria-live="polite">
      <span className={`${s.iconRing} ${celebrate ? s.celebrate : ""}`}><Icon size={30} className={spin ? s.spin : undefined} aria-hidden="true" /></span>
      <h2>{title}</h2>
      {children && <p className={s.muted}>{children}</p>}
      {actions && <div className={s.actions}>{actions}</div>}
    </section>
  );
}
