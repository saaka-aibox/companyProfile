"use client";

/**
 * Light WebRTC mesh (preview video only, no audio).
 * Hidden behind `MeshTransport` so it can be swapped for LiveKit later.
 */

export type PeerLinkState = "connecting" | "connected" | "failed";
export type MeshStats = { rtt: number; relay: boolean; outKbps: number; fps: number };

export interface MeshTransport {
  /** Start the mesh as `selfId`. */
  join(selfId: string): void;
  /** Publish (or replace) the single local camera stream. */
  publish(stream: MediaStream | null): void;
  /** Remote stream arrives (or null when the link is dropped). */
  onTrack(cb: (peerId: string, stream: MediaStream | null) => void): void;
  onPeerState(cb: (peerId: string, state: PeerLinkState) => void): void;
  onSaveMode(cb: (on: boolean) => void): void;
  peerJoined(peerId: string): void;
  peerLeft(peerId: string): void;
  handleSignal(from: string, data: unknown): void;
  stats(): MeshStats;
  leave(): void;
}

type Signal =
  | { k: "offer"; epoch: string; sdp: RTCSessionDescriptionInit }
  | { k: "answer"; epoch: string; sdp: RTCSessionDescriptionInit }
  | { k: "cand"; epoch: string; c: RTCIceCandidateInit }
  | { k: "restart"; epoch: string };

type Link = {
  id: string;
  pc: RTCPeerConnection;
  epoch: string;
  initiator: boolean;
  transceiver: RTCRtpTransceiver;
  remote: MediaStream;
  pending: RTCIceCandidateInit[];
  hasRemote: boolean;
  restarts: number;
  state: PeerLinkState;
  timer: ReturnType<typeof setTimeout> | null;
  lastBytes: number;
  lastAt: number;
};

const PREVIEW_HEIGHT = 360;
const SAVE_HEIGHT = 180;

export type MeshOptions = {
  getIceServers: () => Promise<RTCIceServer[]>;
  send: (to: string, data: unknown) => void;
};

export function p2pSupported() {
  return typeof RTCPeerConnection !== "undefined";
}

export function createP2PMesh(opts: MeshOptions): MeshTransport {
  let selfId = "";
  let stream: MediaStream | null = null;
  let saveMode = false;
  let bandwidthSince = 0;
  let closed = false;
  let monitor: ReturnType<typeof setInterval> | null = null;
  let lastStats: MeshStats = { rtt: 0, relay: false, outKbps: 0, fps: 0 };
  const links = new Map<string, Link>();
  const chain = new Map<string, Promise<void>>();
  let trackCb: (id: string, s: MediaStream | null) => void = () => {};
  let stateCb: (id: string, s: PeerLinkState) => void = () => {};
  let saveCb: (on: boolean) => void = () => {};

  const enqueue = (id: string, fn: () => Promise<void>) => {
    const next = (chain.get(id) ?? Promise.resolve()).then(fn).catch(() => undefined);
    chain.set(id, next);
  };

  const setState = (link: Link, state: PeerLinkState) => {
    if (link.state === state) return;
    link.state = state;
    stateCb(link.id, state);
  };

  async function tune(link: Link) {
    const sender = link.transceiver.sender;
    const track = sender.track;
    if (!track || typeof sender.getParameters !== "function" || typeof sender.setParameters !== "function") return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      const height = track.getSettings().height || 720;
      const target = saveMode ? SAVE_HEIGHT : PREVIEW_HEIGHT;
      const enc = params.encodings[0];
      enc.scaleResolutionDownBy = Math.max(1, height / target);
      enc.maxBitrate = saveMode ? 150_000 : 350_000;
      enc.maxFramerate = 15;
      await sender.setParameters(params);
    } catch {
      /* feature missing or not negotiated yet */
    }
  }

  function closeLink(id: string) {
    const link = links.get(id);
    if (!link) return;
    links.delete(id);
    if (link.timer) clearTimeout(link.timer);
    link.pc.onconnectionstatechange = link.pc.ontrack = link.pc.onicecandidate = link.pc.onnegotiationneeded = null;
    try {
      link.pc.close();
    } catch {
      /* noop */
    }
    trackCb(id, null);
  }

  function armTimeout(link: Link) {
    if (link.timer) clearTimeout(link.timer);
    link.timer = setTimeout(() => {
      if (link.state !== "connected") recover(link);
    }, 15_000);
  }

  function recover(link: Link) {
    if (closed || links.get(link.id) !== link) return;
    if (link.restarts >= 2) {
      setState(link, "failed");
      return;
    }
    link.restarts += 1;
    setState(link, "connecting");
    armTimeout(link);
    if (link.initiator) link.pc.restartIce();
    else opts.send(link.id, { k: "restart", epoch: link.epoch } satisfies Signal);
  }

  async function createLink(id: string, epoch: string): Promise<Link> {
    const iceServers = await opts.getIceServers().catch(() => [] as RTCIceServer[]);
    const pc = new RTCPeerConnection({ iceServers: iceServers.length ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }] });
    const transceiver = pc.addTransceiver("video", { direction: "sendrecv" });
    const link: Link = {
      id, pc, epoch, transceiver, initiator: selfId < id, remote: new MediaStream(), pending: [], hasRemote: false,
      restarts: 0, state: "connecting", timer: null, lastBytes: 0, lastAt: 0,
    };
    const track = stream?.getVideoTracks()[0];
    if (track) void transceiver.sender.replaceTrack(track).then(() => tune(link));
    pc.ontrack = (event) => {
      if (!link.remote.getTracks().includes(event.track)) link.remote.addTrack(event.track);
      trackCb(id, link.remote);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) opts.send(id, { k: "cand", epoch, c: event.candidate.toJSON() } satisfies Signal);
    };
    pc.onconnectionstatechange = () => {
      if (links.get(id) !== link) return;
      const s = pc.connectionState;
      if (s === "connected") {
        if (link.timer) clearTimeout(link.timer);
        link.restarts = 0;
        setState(link, "connected");
        void tune(link);
      } else if (s === "failed") {
        recover(link);
      } else if (s === "disconnected") {
        setTimeout(() => {
          if (links.get(id) === link && pc.connectionState === "disconnected") recover(link);
        }, 4000);
      }
    };
    if (link.initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription(await pc.createOffer());
          opts.send(id, { k: "offer", epoch, sdp: pc.localDescription!.toJSON() } satisfies Signal);
        } catch {
          setState(link, "failed");
        }
      };
    }
    links.set(id, link);
    stateCb(id, "connecting");
    armTimeout(link);
    return link;
  }

  async function flush(link: Link) {
    link.hasRemote = true;
    for (const c of link.pending.splice(0)) await link.pc.addIceCandidate(c).catch(() => undefined);
  }

  async function poll() {
    let bandwidth = false;
    let out = 0;
    let fpsSum = 0;
    let fpsN = 0;
    let rtt = 0;
    let relay = false;
    const now = performance.now();
    for (const link of links.values()) {
      if (link.state !== "connected") continue;
      let report: RTCStatsReport;
      try {
        report = await link.pc.getStats();
      } catch {
        continue;
      }
      const candidates = new Map<string, { candidateType?: string }>();
      report.forEach((s) => {
        if (s.type === "local-candidate") candidates.set(s.id, s);
      });
      report.forEach((s) => {
        if (s.type === "outbound-rtp" && s.kind === "video") {
          if (s.qualityLimitationReason === "bandwidth") bandwidth = true;
          if (typeof s.framesPerSecond === "number") {
            fpsSum += s.framesPerSecond;
            fpsN += 1;
          }
          // bits per millisecond equals kbit/s
          if (link.lastAt && typeof s.bytesSent === "number") out += ((s.bytesSent - link.lastBytes) * 8) / Math.max(1, now - link.lastAt);
          link.lastBytes = s.bytesSent ?? 0;
          link.lastAt = now;
        }
        if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) {
          if (typeof s.currentRoundTripTime === "number") rtt = Math.max(rtt, s.currentRoundTripTime * 1000);
          if (candidates.get(s.localCandidateId)?.candidateType === "relay") relay = true;
        }
      });
    }
    lastStats = { rtt: Math.round(rtt), relay, outKbps: Math.round(out), fps: fpsN ? Math.round(fpsSum / fpsN) : 0 };
    if (bandwidth) {
      bandwidthSince ||= now;
      if (!saveMode && now - bandwidthSince > 5000) {
        saveMode = true;
        saveCb(true);
        links.forEach((l) => void tune(l));
      }
    } else {
      bandwidthSince = 0;
    }
  }

  return {
    join(id) {
      selfId = id;
      closed = false;
      if (!monitor) monitor = setInterval(() => void poll(), 2000);
    },
    publish(next) {
      stream = next;
      const track = next?.getVideoTracks()[0] ?? null;
      links.forEach((link) => {
        void link.transceiver.sender.replaceTrack(track).then(() => tune(link)).catch(() => undefined);
      });
    },
    onTrack(cb) {
      trackCb = cb;
    },
    onPeerState(cb) {
      stateCb = cb;
    },
    onSaveMode(cb) {
      saveCb = cb;
    },
    peerJoined(id) {
      if (closed || id === selfId || !selfId) return;
      enqueue(id, async () => {
        const existing = links.get(id);
        if (existing && existing.state !== "failed") return;
        if (existing) closeLink(id);
        // Non-initiators wait for the offer; the initiator creates the link and offers.
        if (selfId < id) await createLink(id, Math.random().toString(36).slice(2));
      });
    },
    peerLeft(id) {
      enqueue(id, async () => closeLink(id));
    },
    handleSignal(from, raw) {
      const data = raw as Signal | null;
      if (closed || !data || typeof data !== "object" || !("k" in data)) return;
      enqueue(from, async () => {
        let link = links.get(from);
        if (data.k === "offer") {
          if (selfId < from) return; // we are the initiator for this pair
          if (!link || link.epoch !== data.epoch) {
            closeLink(from);
            link = await createLink(from, data.epoch);
          }
          await link.pc.setRemoteDescription(data.sdp);
          await flush(link);
          await link.pc.setLocalDescription(await link.pc.createAnswer());
          opts.send(from, { k: "answer", epoch: data.epoch, sdp: link.pc.localDescription!.toJSON() } satisfies Signal);
          return;
        }
        if (!link || link.epoch !== data.epoch) return;
        if (data.k === "answer") {
          if (link.pc.signalingState === "have-local-offer") {
            await link.pc.setRemoteDescription(data.sdp);
            await flush(link);
          }
        } else if (data.k === "cand") {
          if (link.hasRemote) await link.pc.addIceCandidate(data.c).catch(() => undefined);
          else link.pending.push(data.c);
        } else if (data.k === "restart" && link.initiator) {
          link.pc.restartIce();
        }
      });
    },
    stats: () => lastStats,
    leave() {
      closed = true;
      if (monitor) clearInterval(monitor);
      monitor = null;
      [...links.keys()].forEach(closeLink);
      chain.clear();
    },
  };
}
