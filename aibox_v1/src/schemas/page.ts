import type { Page } from "../types/content";
import { isBlock } from "./block";

export function parsePage(value: unknown): Page | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Partial<Page>;
  if (typeof page.slug !== "string" || typeof page.title !== "string" || !Array.isArray(page.blocks)) return null;
  return page.blocks.every(isBlock) ? (page as Page) : null;
}
