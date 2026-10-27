"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { errorMessage, resolveCode } from "../../../lib/room/api";
import styles from "./create.module.css";

export function JoinByCode() {
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (clean.length < 4) {
      setError("Enter the code your host shared with you.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { roomId } = await resolveCode(clean);
      router.push(`/room/${roomId}`);
    } catch (err) {
      const c = (err as { code?: string }).code;
      setError(c === "ROOM_NOT_FOUND" || c === "NOT_FOUND" ? "We couldn't find a room with that code. Check it and try again." : errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className={styles.join} onSubmit={submit} noValidate>
      <label htmlFor={id} className={styles.joinLabel}>Have a code?</label>
      <div className={styles.joinRow}>
        <input
          id={id}
          className={styles.joinInput}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="ABC123"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={8}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
          Join room
        </button>
      </div>
      <p id={`${id}-err`} className={styles.error} role="alert" hidden={!error}>{error}</p>
    </form>
  );
}
