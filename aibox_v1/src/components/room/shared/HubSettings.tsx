"use client";

import { useState } from "react";
import { HUB_DEFAULT_URL, HUB_URL, normalizeHubUrl, saveHubUrl } from "../../../lib/room/hub-client";
import s from "./hub-settings.module.css";

type Check = { state: "idle" | "busy" | "ok" | "fail"; msg: string };

/** Lets the visitor point this browser at any room_hub (e.g. a Cloudflare tunnel URL). */
export function HubSettings() {
  const [value, setValue] = useState(HUB_URL);
  const [check, setCheck] = useState<Check>({ state: "idle", msg: "" });
  const custom = HUB_URL !== HUB_DEFAULT_URL;

  async function test() {
    const url = normalizeHubUrl(value);
    if (!url) return setCheck({ state: "fail", msg: "Enter a full link starting with https:// (or http://)." });
    setCheck({ state: "busy", msg: "Checking..." });
    try {
      const res = await fetch(`${url}/health`, { cache: "no-store" });
      const body = await res.json();
      setCheck(body?.ok ? { state: "ok", msg: "Server reachable." } : { state: "fail", msg: "Answered, but not a room server." });
    } catch {
      setCheck({ state: "fail", msg: "Cannot reach it. Is the hub and the tunnel running? (An https site cannot call an http:// address.)" });
    }
  }

  function save() {
    const url = normalizeHubUrl(value);
    if (!url) return setCheck({ state: "fail", msg: "Invalid link." });
    saveHubUrl(url);
    window.location.reload();
  }

  function reset() {
    saveHubUrl(null);
    window.location.reload();
  }

  return (
    <details className={s.box} open={custom || undefined}>
      <summary>Server settings{custom ? " (custom server in use)" : ""}</summary>
      <p className={s.help}>
        Paste the room server link (for example your tunnel URL). It is saved in this browser only. Invite links you share carry it automatically.
      </p>
      <label className={s.label}>
        <span>Room server link</span>
        <input
          className={s.input}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://your-name.trycloudflare.com"
          value={value}
          onChange={(e) => { setValue(e.target.value); setCheck({ state: "idle", msg: "" }); }}
        />
      </label>
      <div className={s.row}>
        <button type="button" className="button profile-button-outline" onClick={test}>Test</button>
        <button type="button" className="button button-primary" onClick={save}>Save</button>
        <button type="button" className="button profile-button-outline" onClick={reset}>Reset</button>
      </div>
      <p className={s.status} data-state={check.state} role="status" aria-live="polite">
        {check.msg || `Current: ${HUB_URL}`}
      </p>
    </details>
  );
}
