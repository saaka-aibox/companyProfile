import type { Navigation } from "../types/content";
export function parseNavigation(value: unknown): Navigation | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as Navigation).items)) return null;
  const items = (value as Navigation).items;
  return items.every((item) => typeof item.label === "string" && typeof item.href === "string") ? { items } : null;
}
