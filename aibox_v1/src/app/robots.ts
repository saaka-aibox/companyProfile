import type { MetadataRoute } from "next";
import { isPreviewDeployment, siteUrl } from "../lib/site-config";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/preview"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
