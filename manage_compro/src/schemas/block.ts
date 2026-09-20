import type { Block, BlockType } from "../types/content";
import { z } from "zod";

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

export const colorSchemeSchema = z
  .object({
    background: z.string().optional(),
    text: z.string().optional(),
    accent: z.string().optional(),
    border: z.string().optional(),
  })
  .optional();

export const spacingSchema = z
  .object({
    paddingTop: z.string().optional(),
    paddingBottom: z.string().optional(),
    paddingLeft: z.string().optional(),
    paddingRight: z.string().optional(),
    gap: z.string().optional(),
  })
  .optional();

export const buttonStyleSchema = z
  .object({
    variant: z.enum(["primary", "outline", "dark", "ghost"]).optional(),
    size: z.enum(["small", "medium", "large"]).optional(),
    borderRadius: z.string().optional(),
  })
  .optional();

export const heroSchema = z.object({
  type: z.literal("hero"),
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  cta: z
    .object({
      label: z.string(),
      href: z.string(),
      style: buttonStyleSchema,
    })
    .optional(),
  secondaryCta: z
    .object({
      label: z.string(),
      href: z.string(),
      style: buttonStyleSchema,
    })
    .optional(),
  stats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  layout: z
    .enum(["default", "centered", "split", "stacked", "grid", "carousel"])
    .optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
  backgroundImage: z.string().optional(),
  backgroundVideo: z.string().optional(),
});

export const featureGridSchema = z.object({
  type: z.literal("featureGrid"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  features: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      image: z.string().optional(),
    })
  ),
  steps: z
    .array(
      z.object({
        step: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  layout: z
    .enum(["default", "centered", "split", "stacked", "grid", "carousel"])
    .optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const ctaSchema = z.object({
  type: z.literal("cta"),
  title: z.string().min(1),
  body: z.string().optional(),
  label: z.string().optional(),
  href: z.string().optional(),
  cta: z
    .object({
      label: z.string().optional(),
      href: z.string().optional(),
      style: buttonStyleSchema,
    })
    .optional(),
  style: buttonStyleSchema,
  layout: z
    .enum(["default", "centered", "split", "stacked", "grid", "carousel"])
    .optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const contactFormSchema = z.object({
  type: z.literal("contactForm"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  email: z.string().optional(),   // plain string — don't use .email() as empty string fails
  fields: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      message: z.string().optional(),
      custom: z
        .array(
          z.object({
            label: z.string(),
            type: z.enum(["text", "email", "textarea", "select"]),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  layout: z
    .enum(["default", "centered", "split", "stacked", "grid", "carousel"])
    .optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
  buttonStyle: buttonStyleSchema,
});

export const testimonialsSchema = z.object({
  type: z.literal("testimonials"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  testimonials: z.array(
    z.object({
      quote: z.string(),
      author: z.string(),
      role: z.string().optional(),
      avatar: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
    })
  ),
  layout: z.enum(["carousel", "grid", "masonry"]).optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const pricingSchema = z.object({
  type: z.literal("pricing"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  plans: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      period: z.string().optional(),
      description: z.string().optional(),
      features: z.array(z.string()),
      cta: z.object({
        label: z.string(),
        href: z.string(),
        style: buttonStyleSchema,
      }),
      featured: z.boolean().optional(),
      badge: z.string().optional(),
    })
  ),
  layout: z.enum(["grid", "carousel"]).optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const statsSchema = z.object({
  type: z.literal("stats"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  stats: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
    })
  ),
  layout: z.enum(["grid", "inline"]).optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const storySchema = z.object({
  type: z.literal("story"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  image: z.string().optional(),
  imagePosition: z.enum(["left", "right"]).optional(),
  cta: z
    .object({
      label: z.string(),
      href: z.string(),
      style: buttonStyleSchema,
    })
    .optional(),
  secondaryCta: z
    .object({
      label: z.string(),
      href: z.string(),
      style: buttonStyleSchema,
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  layout: z.enum(["split", "stacked"]).optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const gallerySchema = z.object({
  type: z.literal("gallery"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(
    z.object({
      title: z.string(),
      image: z.string().optional(),
      tag: z.string().optional(),
      tone: z.enum(["gold", "purple", "pink", "blue", "default"]).optional(),
      description: z.string().optional(),
    })
  ),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  layout: z.enum(["grid", "carousel"]).optional(),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const faqSchema = z.object({
  type: z.literal("faq"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
  colorScheme: colorSchemeSchema,
  spacing: spacingSchema,
});

export const dividerSchema = z.object({
  type: z.literal("divider"),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
  color: z.string().optional(),
  spacing: spacingSchema,
});

export const blockSchema = z.discriminatedUnion("type", [
  heroSchema,
  featureGridSchema,
  ctaSchema,
  contactFormSchema,
  testimonialsSchema,
  pricingSchema,
  statsSchema,
  storySchema,
  gallerySchema,
  faqSchema,
  dividerSchema,
]);

export function isBlock(value: unknown): value is Block {
  return blockSchema.safeParse(value).success;
}

export function parseBlock(value: unknown): Block | null {
  const result = blockSchema.safeParse(value);
  return result.success ? (result.data as unknown as Block) : null;
}