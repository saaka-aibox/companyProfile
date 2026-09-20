import type { Page } from "../types/content";
import { blockSchema } from "./block";
import { z } from "zod";

export const pageInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .transform((val) =>
      val
        .toLowerCase()
        .replace(/^\/+/, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .pipe(z.string().min(1, "Slug tidak valid")),
  title: z.string().trim().min(1, "Judul halaman wajib diisi").max(160),
  description: z.string().trim().max(320).optional(),
  blocks: z.array(blockSchema).min(1, "Minimal harus ada 1 blok konten"),
  status: z.enum(["DRAFT", "PUBLISHED", "draft", "published"]).optional(),
});

export function parsePage(value: unknown): Page | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Partial<Page>;
  return typeof page.slug === "string" &&
    typeof page.title === "string" &&
    Array.isArray(page.blocks) &&
    page.blocks.every((b) => blockSchema.safeParse(b).success)
    ? (page as Page)
    : null;
}