export async function publish(slug: string) {
  const { logger } = await import("./logger");
  const log = logger.child("Publish");
  const endpoint = process.env.PUBLIC_REVALIDATE_URL;
  if (!endpoint) { log.warn("Publish webhook is not configured"); return { delivered: false, reason: "PUBLIC_REVALIDATE_URL is not configured" }; }
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-revalidate-secret": process.env.REVALIDATE_SECRET ?? "" }, body: JSON.stringify({ slug }) });
  if (!response.ok) { log.error(`Publish webhook returned ${response.status}`); throw new Error(`Publish webhook returned ${response.status}`); }
  log.ok("Publish webhook delivered", { slug });
  return { delivered: true };
}

export async function revalidatePage(slug: string) {
  return publish(slug);
}