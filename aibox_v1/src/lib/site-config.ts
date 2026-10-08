const configuredUrl = new URL(process.env.SITE_URL || "https://aibox-photo.com");

if (!["http:", "https:"].includes(configuredUrl.protocol) || configuredUrl.username || configuredUrl.password) {
  throw new Error("SITE_URL must be a public HTTP or HTTPS URL without credentials.");
}

export const siteUrl = configuredUrl.origin;
export const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

export function isCmsEnabled() {
  return process.env.CMS_ENABLED === "true" && Boolean(process.env.CONTENT_API_URL?.trim());
}
