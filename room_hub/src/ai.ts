import type { App } from "./app.js";
import { HttpError } from "./http.js";
import type { AiJobReq, AiJobRes, AiStyle } from "./protocol.js";
import { AI_STYLES } from "./protocol.js";
import { Keys } from "./storage.js";
import type { AiJobRec } from "./store.js";
import { log } from "./util.js";

const KEEP =
  "Keep the same composition, number of people, poses and hand gestures, keep each person recognizable. " +
  "No text, no watermark, no extra people.";

export const STYLE_PROMPTS: Record<AiStyle, string> = {
  ghibli: `Redraw this entire photo as a Studio Ghibli watercolor anime artwork with soft painterly backgrounds, gentle natural light and warm hand-painted colors. ${KEEP}`,
  pixar: `Redraw this entire photo as a Pixar-style 3D animated movie still with expressive stylized faces, smooth subsurface skin shading and cinematic lighting. ${KEEP}`,
  retro90s: `Redraw this entire photo as a retro 1990s anime cel illustration with bold clean line art, flat cel shading, slightly faded film colors and subtle grain. ${KEEP}`,
  cyberpunk: `Redraw this entire photo as a cyberpunk neon artwork with glowing magenta and cyan rim lights, rainy night city atmosphere and futuristic details. ${KEEP}`,
  manga: `Redraw this entire photo as a black and white Japanese manga illustration with crisp ink lines, screentone shading and dramatic contrast. ${KEEP}`,
  oil: `Redraw this entire photo as a classical oil painting with visible brush strokes, rich textured pigments and soft museum-style lighting. ${KEEP}`,
};

export function jobView(app: App, j: AiJobRec): AiJobRes {
  return {
    jobId: j.id,
    status: j.status,
    outputUrl: j.status === "done" ? app.storage.presignGet(j.outputKey, 3600) : null,
    error: j.error,
    mock: j.mock,
  };
}

export async function createAiJob(app: App, resultId: string, body: Record<string, unknown>): Promise<AiJobRes> {
  const req = body as Partial<AiJobReq>;
  const result = app.store.results.get(resultId);
  if (!result) throw new HttpError(404, "NOT_FOUND", "Result not found");
  const room = app.store.rooms.get(result.roomId);
  if (!room) throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  if (!req.style || !(AI_STYLES as readonly string[]).includes(req.style)) throw new HttpError(400, "BAD_REQUEST", "Unknown style");
  const m = typeof req.inputKey === "string" ? new RegExp(`^rooms/${result.roomId}/ai/([A-Za-z0-9_-]{16,32})-input\\.jpg$`).exec(req.inputKey) : null;
  if (!m) throw new HttpError(400, "BAD_REQUEST", "inputKey must come from POST /api/results/:id/uploads");
  const jobId = m[1];
  if (app.store.aiJobs.has(jobId)) throw new HttpError(409, "INVALID_STATE", "This upload was already used");
  if (room.aiCredits <= 0) throw new HttpError(402, "PAYMENT_REQUIRED", "No AI credits left");
  const head = await app.storage.head(req.inputKey!);
  if (!head || head.size < 1) throw new HttpError(400, "BAD_REQUEST", "Input image has not been uploaded");

  room.aiCredits -= 1;
  const job: AiJobRec = {
    id: jobId, resultId, roomId: result.roomId, style: req.style as AiStyle, inputKey: req.inputKey!,
    outputKey: Keys.aiOutput(result.roomId, jobId), status: "queued", error: null, mock: !app.cfg.falKey,
    createdAt: Date.now(), refunded: false,
  };
  app.store.aiJobs.set(jobId, job);
  app.store.save();
  return jobView(app, job);
}

export function failJob(app: App, job: AiJobRec, message: string): void {
  if (job.status === "done" || job.status === "failed") return;
  job.status = "failed";
  job.error = message.slice(0, 300);
  if (!job.refunded) {
    job.refunded = true;
    const room = app.store.rooms.get(job.roomId);
    if (room) room.aiCredits += 1;
  }
  app.store.save();
  log(`ai job ${job.id} failed: ${message}`);
}

const busy = new Set<string>();

async function inputImageUrl(app: App, job: AiJobRec): Promise<string> {
  const local = app.storage.mode === "local" && /^https?:\/\/(localhost|127\.|\[?::1)/.test(app.cfg.publicHubUrl);
  if (!local) return app.storage.presignGet(job.inputKey, 900);
  // fal cannot reach localhost: inline the (small) image as a data URI.
  const buf = await app.storage.get(job.inputKey);
  if (!buf) throw new Error("input missing");
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function stepMock(app: App, job: AiJobRec): Promise<void> {
  if (Date.now() - job.createdAt < app.cfg.timing.aiMockDelayMs) return;
  const input = await app.storage.get(job.inputKey);
  if (!input) return failJob(app, job, "input image missing");
  await app.storage.put(job.outputKey, input, "image/jpeg");
  job.status = "done";
  app.store.save();
}

async function stepFal(app: App, job: AiJobRec): Promise<void> {
  const { cfg } = app;
  const headers = { Authorization: `Key ${cfg.falKey}`, "Content-Type": "application/json" };
  const now = Date.now();
  if (!job.falRequestId) {
    const body = {
      image_url: await inputImageUrl(app, job),
      prompt: STYLE_PROMPTS[job.style],
      guidance_scale: 3.5,
      output_format: "jpeg",
      num_images: 1,
      safety_tolerance: "2",
    };
    const r = await app.fetchFn(`https://queue.fal.run/${cfg.falStyleEndpoint}`, {
      method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const j: any = await r.json().catch(() => null);
    if (!r.ok || !j?.request_id) return failJob(app, job, `fal submit failed (${r.status}) ${JSON.stringify(j?.detail ?? j?.error ?? "").slice(0, 120)}`);
    job.falRequestId = j.request_id;
    job.falStatusUrl = j.status_url ?? `https://queue.fal.run/${cfg.falStyleEndpoint}/requests/${j.request_id}/status`;
    job.falResponseUrl = j.response_url ?? `https://queue.fal.run/${cfg.falStyleEndpoint}/requests/${j.request_id}`;
    job.falSubmittedAt = now;
    job.status = "running";
    job.lastPollAt = 0;
    app.store.save();
    return;
  }
  if (now - (job.falSubmittedAt ?? now) > cfg.timing.aiTimeoutMs) return failJob(app, job, "AI job timed out");
  if (now - (job.lastPollAt ?? 0) < cfg.timing.aiPollMs) return;
  job.lastPollAt = now;
  const sr = await app.fetchFn(job.falStatusUrl!, { headers: { Authorization: `Key ${cfg.falKey}` }, signal: AbortSignal.timeout(15000) });
  const st: any = await sr.json().catch(() => null);
  if (!sr.ok) {
    if (sr.status >= 500 || sr.status === 429) return; // transient; retried until the deadline
    return failJob(app, job, `fal status ${sr.status}`);
  }
  if (st?.status !== "COMPLETED") return;
  const rr = await app.fetchFn(job.falResponseUrl!, { headers: { Authorization: `Key ${cfg.falKey}` }, signal: AbortSignal.timeout(20000) });
  const out: any = await rr.json().catch(() => null);
  const url = out?.images?.[0]?.url ?? out?.image?.url;
  if (!rr.ok || !url) return failJob(app, job, `fal failed (${rr.status}) ${JSON.stringify(out?.detail ?? out?.error ?? "").slice(0, 120)}`);
  const dl = await app.fetchFn(url, { signal: AbortSignal.timeout(30000) });
  if (!dl.ok) return failJob(app, job, `output download ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024 || buf.length < 100) return failJob(app, job, "bad output size");
  await app.storage.put(job.outputKey, buf, "image/jpeg");
  job.status = "done";
  app.store.save();
}

export async function aiTick(app: App): Promise<void> {
  for (const job of app.store.aiJobs.values()) {
    if (job.status === "done" || job.status === "failed" || busy.has(job.id)) continue;
    busy.add(job.id);
    void (async () => {
      try {
        if (job.mock) await stepMock(app, job);
        else await stepFal(app, job);
      } catch (e) {
        failJob(app, job, e instanceof Error ? e.message : "AI error");
      } finally {
        busy.delete(job.id);
      }
    })();
  }
}

export function startAiLoop(app: App): NodeJS.Timeout {
  const t = setInterval(() => void aiTick(app), 400);
  t.unref?.();
  return t;
}

