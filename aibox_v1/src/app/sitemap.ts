import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/product", "/gallery", "/connect", "/playground", "/room", "/games"].map(path => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
