import type { Block } from "../types/content";
import { Cta } from "../components/blocks/cta";
import { ContactForm } from "../components/blocks/contact-form";
import { Divider } from "../components/blocks/divider";
import { FeatureGrid } from "../components/blocks/feature-grid";
import { Hero } from "../components/blocks/hero";
import { Pricing } from "../components/blocks/pricing";
import { Stats } from "../components/blocks/stats";
import { Story } from "../components/blocks/story";
import { Testimonials } from "../components/blocks/testimonials";
import { Faq } from "../components/blocks/faq";
import { Gallery } from "../components/blocks/gallery";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    switch (block.type) {
      case "hero":
        return <Hero key={key} {...block} />;
      case "featureGrid":
        return <FeatureGrid key={key} {...block} />;
      case "cta":
        return <Cta key={key} {...block} />;
      case "contactForm":
        return <ContactForm key={key} {...block} />;
      case "testimonials":
        return <Testimonials key={key} {...block} />;
      case "pricing":
        return <Pricing key={key} {...block} />;
      case "stats":
        return <Stats key={key} {...block} />;
      case "story":
        return <Story key={key} {...block} />;
      case "gallery":
        return <Gallery key={key} {...block} />;
      case "faq":
        return <Faq key={key} {...block} />;
      case "divider":
        return <Divider key={key} {...block} />;
    }
  });
}