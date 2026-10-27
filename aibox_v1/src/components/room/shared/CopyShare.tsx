"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import styles from "./shared.module.css";

/** Copy + Web Share buttons for a link. Share is hidden where the Web Share API is missing. */
export function CopyShare({ url, title, text }: { url: string; title: string; text?: string }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setNote("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote("Copy isn't available here. Select the link and copy it manually.");
    }
  }
  async function share() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* dismissed */
    }
  }
  return (
    <div className={styles.actions}>
      <button type="button" className="button profile-button-outline" onClick={copy}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {canShare && (
        <button type="button" className="button profile-button-outline" onClick={share}>
          <Share2 size={16} aria-hidden="true" /> Share
        </button>
      )}
      <span className={styles.srOnly} role="status" aria-live="polite">{note}</span>
    </div>
  );
}
