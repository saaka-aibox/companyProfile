---
name: aibox-design-system
description: "Design system for AI Box (team EMKABEH's smart AI photobooth/photobox product) — its company profile website and CMS-driven page/block templates. Synthesizes two references: teenage engineering's confident, flat-color, product-photography-led industrial style, and Guardrails AI / Snowglobe's clean enterprise-SaaS structure (video hero, three-stage feature cards, trust bar, testimonial block) — reframed around AI Box's real product: hand-gesture-triggered photo capture and AI-generated custom photo frames, rented out for weddings, corporate events, exhibitions, malls, and tourist attractions. ALWAYS consult this before writing, generating, styling, or reviewing any page, section, or component for the AI Box site or its CMS block library — hero sections, feature grids, frame/package galleries, trust bars, testimonials, CTA banners, nav, forms, pricing — even if the user just says 'build the homepage', 'add a features section', 'make a pricing block', or similar, without naming the design system explicitly."
---

# AI Box Design System

Grounded in the team's actual Business Plan Competition 2024 proposal — not a generic
photobooth template. Two style references anchor the visual language; take their
_composition principles_, not their literal brand assets (don't reuse either brand's exact
colors, logo, or copy).

- **teenage engineering** → confident flat color-blocking, real product photography as the
  hero (never illustration/gradient), dense-but-organized grids of "tiles," lowercase
  technical micro-labels, numbers/specs shown proudly, no shadows, no chrome.
- **Guardrails AI / Snowglobe** → calm structure borrowed from enterprise SaaS: video-led
  hero, a three-card "stages" feature block, a trust/logo bar, quote-style testimonials,
  repeated flat CTA banners.

The result should read as **a premium, design-forward gadget — not a wedding-vendor site
with clip-art cameras and neon gradients.** Most photobooth competitors look cheap; AI Box
should look like a product worth seeking out.

## What AI Box actually is — ground every page in this

- **Product**: a smart photobooth/photobox. Two real features carry the entire pitch:
  1. **Hand gesture detection** — the camera fires from a wave, never a button press.
  2. **AI generative image** — the user types a prompt and AI Box generates a one-of-a-kind
     photo frame design, instead of picking from a handful of stock templates.
- **Real flow** (from the team's own UI draft): wave at the camera → scan a QR code →
  generate or pick a frame → countdown → photo → print.
- **Physical unit**: a booth with a dark upper section housing the camera/screen, sitting on
  a wood-tone lower cabinet. Photograph or render _this real object_ for every hero — never
  a generic clip-art camera icon like the current placeholder mockup uses.
- **Who rents it**: event organizers, wedding/corporate event planners, tourism sites, and
  malls/properties — this is the trust bar's actual content (matches the proposal's Key
  Partnership section).
- **Who uses it**: 18–35 year-olds into photography, videography, and social media, who
  want a photo they'll actually want to post — not a generic printed strip.
- **Revenue**: booth rental per event, sponsor/ad placement on the frame or backdrop, and
  per-photo print/customization fees — a pricing or "book it" section should speak to
  organizers as much as end users.

## Design tokens

Ship these as CSS custom properties so every CMS-rendered block pulls from one source.

```css
:root {
  /* surfaces — warm off-white, not clinical white */
  --aibox-bg: #f5f4ef;
  --aibox-surface: #ffffff;
  --aibox-ink: #14140f;
  --aibox-ink-muted: #5a594f;
  --aibox-line: #dcdacf;

  /* one warm accent (photography/human — evokes a flash/shutter) +
     one cool accent (AI/tech precision) — never both in the same block */
  --aibox-accent: #ff5a1f; /* flash orange — primary CTA, tags, one hero element */
  --aibox-accent-2: #1c3fff; /* electric blue — AI/tech callouts, secondary CTA */

  /* spacing (8px base) */
  --aibox-space-1: 8px;
  --aibox-space-2: 16px;
  --aibox-space-3: 24px;
  --aibox-space-4: 32px;
  --aibox-space-5: 48px;
  --aibox-space-6: 64px;

  --aibox-radius: 6px; /* small, consistent — never full pill except tags */
  --aibox-shadow: none; /* flat surfaces only, no drop shadows */
}

[data-theme='dark'] {
  --aibox-bg: #111110;
  --aibox-surface: #1a1a18;
  --aibox-ink: #f2f1ea;
  --aibox-ink-muted: #a6a498;
  --aibox-line: #2c2b27;
}
```

**Typography** — two families max:

| Role                                      | Family idea                                                      | Case / treatment                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Headlines, body                           | A clean grotesk/humanist sans (Inter, General Sans, Söhne-alike) | Sentence case, tight tracking on headlines                                                                   |
| Eyebrows, nav labels, frame/package codes | A monospace (JetBrains Mono, IBM Plex Mono)                      | **all lowercase**, letter-spaced — the single most recognizable "te" move; use it everywhere a label appears |

## The six CMS blocks

1. **Hero** — real photo or short looping video of the actual booth, mid-use, someone
   waving at it. Eyebrow (lowercase mono): `ai photobooth`. Headline states the real
   differentiator plainly — e.g. "no button. just wave." One CTA in `--aibox-accent`:
   "book for your event."
2. **Trust bar** — the real partner categories: event organizers, wedding venues, tourist
   attractions, malls/properties. Grayscale logos or wordmarks, one row, hairline dividers.
3. **Three-stage feature grid** — the real flow, compressed to three moves:
   `wave` → `generate` → `print`. Each card: a flat-color swatch, lowercase mono label, one
   sentence naming the actual feature (gesture detection / AI frame generation / physical
   keepsake) — never generic "revolutionize your event" filler.
4. **Frame / package tile grid** — two valid uses, pick per page:
   - a gallery of AI-generated frame styles as flat-color tiles with catalog-style codes
     (`frm–01`, `frm–02`...) — doubles as a portfolio and a "look what it can make" demo;
   - rental package tiers (wedding / corporate / exhibition) as tiles with a spec line
     (hours included, prints included, add-ons).
5. **Testimonial** — a real persona: a couple, an event planner, or a sponsor brand — not
   an enterprise "Head of AI" quote. Short, specific, tied to a real event type.
6. **CTA banner** — full-width flat `--aibox-accent` band: "book ai box for your next
   event," not a generic SaaS "get started."

## Motion

Restrained. Prefer a real video/GIF of someone waving at the booth and the frame
generating over JS-driven hero effects (particles, animated gradients, 3D canvases).
Scroll transitions are simple fades/slides, nothing bouncy.

## Copy / microcopy rules

- Eyebrows, nav labels, tile codes: lowercase mono.
- Headlines: sentence case, short, concrete — lead with the two real differentiators
  (no-touch capture, AI-generated frames) instead of "revolutionize the photobox industry."
- Numbers earn their place: frames generated, events served, print time, resolution —
  show them proudly like teenage engineering shows wattage/size, not buried in a spec sheet.

## Do / don't

| Do                               | Don't                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| Real booth photography/video     | Clip-art camera icons, Lorem ipsum placeholders (the current draft UI) |
| Flat color-blocked frame gallery | Neon/candy "kids' party" photobooth clichés                            |
| Lowercase mono micro-labels      | Comic Sans / bubble fonts                                              |
| Concrete, feature-first copy     | Generic enterprise-SaaS gradients, stock wedding photography           |
| One accent color per section     | Purple/blue AI-startup gradients                                       |

## Applying this in code

- Centralize tokens in one CSS/Tailwind config file; every block component reads from it —
  never hard-code a hex value in a component.
- Build each of the six blocks as its own typed React component (`<Hero />`,
  `<FeatureGrid3 />`, `<FrameTileGrid />`, `<TrustBar />`, `<Testimonial />`,
  `<CtaBanner />`) so the separate CMS/management system can configure content/props per
  page, matching the existing reproducible-architecture goal.
- See `references/example-components.md` for a starter Hero + three-stage feature grid +
  frame tile grid in React/Tailwind, wired to the tokens above and to AI Box's real copy.

## When a new section doesn't fit the six blocks

Default to: one flat surface, one accent color, a lowercase mono micro-label, a real photo
of the booth or a real generated frame over an illustration. Check it against the two real
features (no-touch capture, AI-generated frames) before adding decoration — if you can't
tie a new section back to one of those two things, simplify rather than invent filler.
