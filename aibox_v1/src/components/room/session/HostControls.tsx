"use client";

import { Check, Copy, Hand, MousePointerClick, Timer } from "lucide-react";
import { useState } from "react";
import type { Quorum, Trigger } from "../../../lib/room/protocol";
import s from "./session.module.css";

const TRIGGERS: { id: Trigger; label: string; icon: typeof Hand }[] = [
  { id: "manual", label: "Manual", icon: MousePointerClick },
  { id: "timer", label: "Timer", icon: Timer },
  { id: "peace", label: "AI Peace", icon: Hand },
];
const QUORUMS: { id: Quorum; label: string }[] = [
  { id: "all", label: "All" },
  { id: "majority", label: "Majority" },
  { id: "host", label: "Host only" },
];

export function HostControls({ trigger, quorum, disabled, onChange }: {
  trigger: Trigger; quorum: Quorum; disabled?: boolean; onChange: (s: { trigger?: Trigger; quorum?: Quorum }) => void;
}) {
  return (
    <section className={s.card} aria-label="Host controls">
      <div className={s.field}>
        <span className={s.label}>how to take the photo</span>
        <div className={s.seg} role="group" aria-label="Photo trigger">
          {TRIGGERS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={trigger === id} disabled={disabled} onClick={() => onChange({ trigger: id })}>
              <Icon size={15} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>
      {trigger === "peace" && (
        <div className={s.field}>
          <span className={s.label}>who must show ✌</span>
          <div className={s.seg} role="group" aria-label="Peace quorum">
            {QUORUMS.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={quorum === id} disabled={disabled} onClick={() => onChange({ quorum: id })}>{label}</button>
            ))}
          </div>
        </div>
      )}
      <p className={s.muted}>
        {trigger === "manual" && "You press Take photo and everyone gets a synced 3-2-1."}
        {trigger === "timer" && "The next shot starts by itself a few seconds after each review."}
        {trigger === "peace" && "Show a peace sign to the camera. The countdown starts when enough people do."}
      </p>
    </section>
  );
}

export function InviteStrip({ roomId, joinCode }: { roomId: string; joinCode: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  async function copy(kind: "link" | "code") {
    const text = kind === "link" ? `${window.location.origin}/room/${roomId}` : joinCode;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      ta.remove();
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className={`${s.card} ${s.invite}`} aria-label="Invite friends">
      <span className={s.label}>invite friends</span>
      <div className={s.inviteRow}>
        <div className={s.code} aria-label={`Join code ${joinCode.split("").join(" ")}`}>{joinCode}</div>
        <button type="button" className={s.iconBtn} onClick={() => copy("code")} aria-label="Copy join code">
          {copied === "code" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        </button>
      </div>
      <button type="button" className={`button ${s.ghost}`} onClick={() => copy("link")}>
        {copied === "link" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied === "link" ? "Link copied" : "Copy invite link"}
      </button>
    </section>
  );
}
