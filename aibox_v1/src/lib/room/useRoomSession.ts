"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { grabStillWithSize, holdWakeLock } from "./capture";
import { atServerTime, HubClient } from "./hub-client";
import {
  ROUNDS,
  type JoinRes,
  type Peer,
  type Quorum,
  type RoomSummary,
  type ServerMsg,
  type SessionState,
  type Trigger,
} from "./protocol";
import { createP2PMesh, p2pSupported, type MeshTransport, type PeerLinkState } from "./rtc";
import { buildRoundTile, composeStrip } from "./session-compose";
import { fetchIce, fetchRoomSummary, putObject } from "./session-http";
import type { LocalCamera } from "./useLocalCamera";

export type LinkStatus = "connecting" | "open" | "closed";
export type UploadState = "idle" | "capturing" | "uploading" | "done" | "failed";
export type ComposeStatus = "idle" | "loading" | "building" | "uploading" | "done" | "failed";
export type RoundReadyMsg = Extract<ServerMsg, { type: "round_ready" }>;

export type SessionView = {
  link: LinkStatus;
  everOpen: boolean;
  /** Socket stayed closed (server told us to stop, e.g. 4001) */
  ended: boolean;
  youId: string | null;
  peers: Peer[];
  room: RoomSummary;
  session: SessionState | null;
  peace: { have: number; needed: number; counts: Record<string, boolean> } | null;
  countdown: { round: number; attempt: number; shootAt: number; n: number | null } | null;
  flash: boolean;
  upload: UploadState;
  roundReady: RoundReadyMsg | null;
  /** round -> slot -> signed still URL (latest round_ready per round) */
  stills: Record<number, Record<number, string>>;
  completed: { resultId: string; resultUrl: string } | null;
  notice: string | null;
  remoteStreams: Record<string, MediaStream>;
  linkStates: Record<string, PeerLinkState>;
  saveMode: boolean;
  compose: ComposeStatus;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useRoomSession(opts: { join: JoinRes; name: string; camera: LocalCamera; mp: boolean }) {
  const { join, name, camera, mp } = opts;
  const [view, setView] = useState<SessionView>(() => ({
    link: "connecting", everOpen: false, ended: false, youId: null, peers: [], room: join.room, session: null, peace: null,
    countdown: null, flash: false, upload: "idle", roundReady: null, stills: {}, completed: null, notice: null,
    remoteStreams: {}, linkStates: {}, saveMode: false, compose: "idle",
  }));
  const viewRef = useRef(view);
  const clientRef = useRef<HubClient | null>(null);
  const meshRef = useRef<MeshTransport | null>(null);
  const cameraRef = useRef(camera);
  const pendingRef = useRef<{ round: number; attempt: number; blob: Blob; w: number; h: number } | null>(null);
  const uploadWaiters = useRef(new Map<string, (m: Extract<ServerMsg, { type: "upload_url" }>) => void>());
  const composeWaiter = useRef<((m: Extract<ServerMsg, { type: "compose_url" }>) => void) | null>(null);
  const composingRef = useRef(false);
  const cancelCountdown = useRef<(() => void)[]>([]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const patch = useCallback((p: Partial<SessionView> | ((v: SessionView) => Partial<SessionView>)) => {
    setView((v) => {
      const next = { ...v, ...(typeof p === "function" ? p(v) : p) };
      viewRef.current = next;
      return next;
    });
  }, []);

  // ----- upload pipeline (retry 3x with backoff, blob kept in memory) -----
  const runUpload = useCallback(async (round: number, attempt: number) => {
    const client = clientRef.current;
    const pending = pendingRef.current;
    if (!client || !pending || pending.round !== round || pending.attempt !== attempt) return;
    patch({ upload: "uploading" });
    for (let i = 0; i < 3; i++) {
      try {
        const info = await new Promise<Extract<ServerMsg, { type: "upload_url" }>>((resolve, reject) => {
          const key = `${round}:${attempt}`;
          const timer = setTimeout(() => {
            uploadWaiters.current.delete(key);
            reject(new Error("timeout"));
          }, 7000);
          uploadWaiters.current.set(key, (m) => {
            clearTimeout(timer);
            resolve(m);
          });
          client.send({ type: "upload_req", round, attempt });
        });
        await putObject(info.url, pending.blob, info.headers);
        client.send({ type: "captured", round, attempt, key: info.key, w: pending.w, h: pending.h, bytes: pending.blob.size });
        patch({ upload: "done" });
        return;
      } catch {
        await sleep(600 * 3 ** i);
      }
    }
    patch({ upload: "failed" });
  }, [patch]);

  const retryUpload = useCallback(() => {
    const p = pendingRef.current;
    if (p) void runUpload(p.round, p.attempt);
  }, [runUpload]);

  // ----- host composing -----
  const runCompose = useCallback(async () => {
    const client = clientRef.current;
    const v = viewRef.current;
    if (!client || !v.room.frameId || composingRef.current) return;
    composingRef.current = true;
    try {
      patch({ compose: "loading", notice: null });
      const tiles: HTMLCanvasElement[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const bySlot = viewRef.current.stills[r];
        const urls = bySlot ? Object.keys(bySlot).map(Number).sort((a, b) => a - b).map((s) => bySlot[s]) : [];
        if (urls.length === 0) throw new Error(`Photos for shot ${r + 1} are missing on this device. Please keep this page open and try again.`);
        patch({ compose: "building" });
        tiles.push(await buildRoundTile(v.room.frameId, urls));
      }
      const { final, thumb } = await composeStrip(v.room.frameId, tiles);
      patch({ compose: "uploading" });
      const urlMsg = await new Promise<Extract<ServerMsg, { type: "compose_url" }>>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("The server did not answer. Please retry.")), 10_000);
        composeWaiter.current = (m) => {
          clearTimeout(timer);
          resolve(m);
        };
        client.send({ type: "compose_req" });
      });
      const put = async (target: { url: string; headers: Record<string, string> }, blob: Blob) => {
        let last: unknown;
        for (let i = 0; i < 3; i++) {
          try {
            return await putObject(target.url, blob, target.headers);
          } catch (e) {
            last = e;
            await sleep(600 * 3 ** i);
          }
        }
        throw last;
      };
      await Promise.all([put(urlMsg.final, final), put(urlMsg.thumb, thumb)]);
      client.send({ type: "compose_done", finalKey: urlMsg.final.key, thumbKey: urlMsg.thumb.key });
      patch({ compose: "done" });
    } catch (cause) {
      patch({ compose: "failed", notice: cause instanceof Error ? cause.message : "The photostrip could not be built." });
    } finally {
      composingRef.current = false;
    }
  }, [patch]);

  // ----- connection lifecycle -----
  useEffect(() => {
    let disposed = false;
    const client = new HubClient(join.joinToken, name, { mp });
    clientRef.current = client;
    let icePromise: Promise<RTCIceServer[]> | null = null;
    const mesh = createP2PMesh({
      getIceServers: () => (icePromise ??= fetchIce(join.joinToken).then((r) => r.iceServers as RTCIceServer[])),
      send: (to, data) => client.send({ type: "signal", to, data }),
    });
    meshRef.current = mesh;
    mesh.onTrack((id, stream) =>
      patch((v) => {
        const remoteStreams = { ...v.remoteStreams };
        if (stream) remoteStreams[id] = stream;
        else delete remoteStreams[id];
        return { remoteStreams };
      }),
    );
    mesh.onPeerState((id, s) => patch((v) => ({ linkStates: { ...v.linkStates, [id]: s } })));
    mesh.onSaveMode((saveMode) => patch({ saveMode }));
    if (cameraRef.current.stream) mesh.publish(cameraRef.current.stream);
    const releaseWake = holdWakeLock();

    const offs: (() => void)[] = [];
    const on = <T extends ServerMsg["type"]>(t: T, h: (m: Extract<ServerMsg, { type: T }>) => void) => offs.push(client.on(t, h));

    let closedTimer: ReturnType<typeof setTimeout> | null = null;
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    offs.push(
      client.onStatus((link) => {
        if (disposed) return;
        patch((v) => ({ link, everOpen: v.everOpen || link === "open" }));
        if (closedTimer) clearTimeout(closedTimer);
        if (endTimer) clearTimeout(endTimer);
        if (link === "open") patch({ ended: false });
        if (link === "closed") {
          // Close code is not exposed by HubClient: ask the room whether it finished.
          closedTimer = setTimeout(() => {
            void fetchRoomSummary(join.room.id).then((room) => !disposed && patch({ room })).catch(() => undefined);
          }, 2500);
          endTimer = setTimeout(() => !disposed && patch({ ended: true }), 16_000);
        }
      }),
    );

    on("welcome", (m) => {
      mesh.join(m.you);
      patch({ youId: m.you, peers: m.peers, room: m.room, session: m.session });
      m.peers.forEach((p) => p.id !== m.you && p.connected && mesh.peerJoined(p.id));
    });
    on("peer_join", (m) => {
      patch((v) => ({ peers: [...v.peers.filter((p) => p.id !== m.peer.id), m.peer] }));
      if (m.peer.connected) mesh.peerJoined(m.peer.id);
    });
    on("peer_update", (m) => {
      patch((v) => ({ peers: v.peers.some((p) => p.id === m.peer.id) ? v.peers.map((p) => (p.id === m.peer.id ? m.peer : p)) : [...v.peers, m.peer] }));
      if (m.peer.connected) mesh.peerJoined(m.peer.id);
      else mesh.peerLeft(m.peer.id);
    });
    on("peer_leave", (m) => {
      mesh.peerLeft(m.id);
      patch((v) => ({ peers: v.peers.filter((p) => p.id !== m.id) }));
    });
    on("signal", (m) => mesh.handleSignal(m.from, m.data));
    on("state", (m) => {
      patch((v) => {
        const quiet = m.session.phase === "lobby" || m.session.phase === "pose_ready" || m.session.phase === "countdown";
        return {
          session: m.session,
          room: m.room,
          roundReady: quiet ? null : v.roundReady,
          peace: m.session.phase === "pose_ready" ? v.peace : null,
        };
      });
    });
    on("peace", (m) => patch({ peace: { have: m.have, needed: m.needed, counts: m.counts } }));
    on("countdown", (m) => {
      cancelCountdown.current.forEach((c) => c());
      cancelCountdown.current = [];
      pendingRef.current = null;
      patch({ countdown: { round: m.round, attempt: m.attempt, shootAt: m.shootAt, n: null }, flash: false, upload: "idle", roundReady: null, notice: null });
      for (let n = m.seconds; n >= 1; n--) {
        cancelCountdown.current.push(
          atServerTime(client, m.shootAt - n * 1000, () => patch((v) => (v.countdown ? { countdown: { ...v.countdown, n } } : {}))),
        );
      }
      cancelCountdown.current.push(
        atServerTime(client, m.shootAt, () => {
          navigator.vibrate?.(30);
          patch((v) => ({ flash: true, upload: "capturing", countdown: v.countdown ? { ...v.countdown, n: 0 } : null }));
          setTimeout(() => !disposed && patch({ flash: false }), 380);
          setTimeout(() => !disposed && patch({ countdown: null }), 900);
          const video = cameraRef.current.getVideo();
          if (!video) {
            patch({ upload: "failed", notice: "Your camera was not ready for this shot." });
            return;
          }
          // drawImage runs synchronously inside this call: the frame is frozen at shootAt.
          grabStillWithSize(video).then(
            (still) => {
              pendingRef.current = { round: m.round, attempt: m.attempt, ...still };
              void runUpload(m.round, m.attempt);
            },
            () => patch({ upload: "failed", notice: "Could not capture your photo. Please retry." }),
          );
        }),
      );
    });
    on("upload_url", (m) => {
      const key = `${m.round}:${m.attempt}`;
      uploadWaiters.current.get(key)?.(m);
      uploadWaiters.current.delete(key);
    });
    on("round_ready", (m) => {
      patch((v) => ({
        roundReady: m,
        stills: { ...v.stills, [m.round]: Object.fromEntries(m.stills.map((s) => [s.slot, s.url])) },
      }));
    });
    on("compose_url", (m) => {
      composeWaiter.current?.(m);
      composeWaiter.current = null;
    });
    on("completed", (m) => {
      pendingRef.current = null;
      patch({ completed: { resultId: m.resultId, resultUrl: m.resultUrl } });
    });
    on("error", (m) => {
      if (m.code === "ROOM_COMPLETED") void fetchRoomSummary(join.room.id).then((room) => !disposed && patch({ room })).catch(() => undefined);
      patch({ notice: m.message });
    });

    const statsTimer = setInterval(() => {
      if (client.status === "open") client.send({ type: "stats", ...mesh.stats() });
    }, 15_000);

    client.connect();

    return () => {
      disposed = true;
      clearInterval(statsTimer);
      if (closedTimer) clearTimeout(closedTimer);
      if (endTimer) clearTimeout(endTimer);
      cancelCountdown.current.forEach((c) => c());
      cancelCountdown.current = [];
      offs.forEach((o) => o());
      releaseWake();
      mesh.leave();
      client.close();
      clientRef.current = null;
      meshRef.current = null;
    };
  }, [join.joinToken, join.room.id, name, mp, patch, runUpload]);

  // publish the camera (again) whenever the stream changes, e.g. after the tab returns
  useEffect(() => {
    meshRef.current?.publish(camera.stream);
  }, [camera.stream]);

  // host builds the strip once, as soon as the room reaches `composing`
  const isHost = view.peers.find((p) => p.id === view.youId)?.role === "host" || join.role === "host";
  const phase = view.session?.phase;
  useEffect(() => {
    if (phase === "composing" && isHost && view.compose === "idle") void runCompose();
  }, [phase, isHost, view.compose, runCompose]);

  const send = useCallback((m: Parameters<HubClient["send"]>[0]) => clientRef.current?.send(m), []);

  return {
    view,
    isHost,
    p2pSupported: p2pSupported(),
    setSettings: (s: { trigger?: Trigger; quorum?: Quorum }) => send({ type: "settings", ...s }),
    startRound: () => send({ type: "start_round" }),
    review: (round: number, action: "accept" | "retake") => send({ type: "review", round, action }),
    setReady: (on: boolean) => send({ type: "ready", on }),
    setPeace: (peace: boolean) => send({ type: "gesture", peace }),
    retryUpload,
    retryCompose: () => {
      patch({ compose: "idle" });
    },
  };
}

export type RoomSession = ReturnType<typeof useRoomSession>;
