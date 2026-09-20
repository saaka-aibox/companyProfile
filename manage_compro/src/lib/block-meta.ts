import { blockTypes } from "../schemas/block";

export const blockMeta = Object.fromEntries(
  blockTypes.map((type) => [
    type,
    {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      help: `Konfigurasi blok ${type}`,
      category: getCategory(type),
      icon: getIcon(type),
    },
  ])
);

function getCategory(type: string): string {
  switch (type) {
    case "hero":
      return "Hero & Intro";
    case "story":
      return "Hero & Intro";
    case "featureGrid":
    case "stats":
      return "Features";
    case "testimonials":
      return "Social Proof";
    case "gallery":
      return "Social Proof";
    case "faq":
      return "Help & FAQ";
    case "pricing":
      return "Conversion";
    case "cta":
      return "Conversion";
    case "contactForm":
      return "Forms";
    case "divider":
      return "Layout";
    default:
      return "Other";
  }
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    hero: "🏠",
    featureGrid: "✨",
    cta: "🎯",
    contactForm: "📝",
    testimonials: "💬",
    pricing: "💰",
    stats: "📊",
    story: "📖",
    gallery: "🖼️",
    faq: "❓",
    divider: "➖",
  };
  return icons[type] || "📦";
}