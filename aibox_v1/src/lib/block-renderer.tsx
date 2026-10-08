import { Fragment, type ReactNode } from "react";
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
import { GesturePlayground } from "../components/landing/GesturePlayground";

export function BlockRenderer({ blocks, showPlayground = false }: { blocks: Block[]; showPlayground?: boolean }) {
  const firstHeroIndex = blocks.findIndex((block) => block.type === "hero");

  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    let content: ReactNode = null;
    switch (block.type) {
      case "hero":
        content = <Hero {...block} />;
        break;
      case "featureGrid":
        content = <FeatureGrid {...block} />;
        break;
      case "cta":
        content = <Cta {...block} />;
        break;
      case "contactForm":
        content = <ContactForm {...block} />;
        break;
      case "testimonials":
        content = <Testimonials {...block} />;
        break;
      case "pricing":
        content = <Pricing {...block} />;
        break;
      case "stats":
        content = <Stats {...block} />;
        break;
      case "story":
        content = <Story {...block} />;
        break;
      case "gallery":
        content = <Gallery {...block} />;
        break;
      case "faq":
        content = <Faq {...block} />;
        break;
      case "divider":
        content = <Divider {...block} />;
        break;
    }
    return (
      <Fragment key={key}>
        {content}
        {showPlayground && index === firstHeroIndex && <GesturePlayground />}
      </Fragment>
    );
  });
}
