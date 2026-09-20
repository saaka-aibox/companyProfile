import type { Block } from "../types/content";

export const blockTypes = [
  "hero",
  "featureGrid",
  "cta",
  "contactForm",
  "testimonials",
  "pricing",
  "stats",
  "story",
  "gallery",
  "faq",
  "divider",
] as const;
export type BlockType = (typeof blockTypes)[number];

export function isBlock(value: unknown): value is Block {
  return Boolean(value && typeof value === "object" && "type" in value && blockTypes.includes((value as { type: BlockType }).type));
}
