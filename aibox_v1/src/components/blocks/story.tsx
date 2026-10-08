import type { CSSProperties } from "react";
import type { Block, ButtonStyle } from "../../types/content";
import { MagicBoothModel } from "../landing/MagicBoothModel";

function getStyle(block: Block): CSSProperties & Record<string, string | undefined> {
  const style: CSSProperties & Record<string, string | undefined> = {};
  const colors = block.colorScheme;
  const spacing = block.spacing;

  if (colors?.background) style.backgroundColor = colors.background;
  if (colors?.text) style.color = colors.text;
  if (colors?.accent) style["--accent"] = colors.accent;
  if (colors?.border) style.borderColor = colors.border;
  if (spacing?.paddingTop) style.paddingTop = spacing.paddingTop;
  if (spacing?.paddingBottom) style.paddingBottom = spacing.paddingBottom;
  if (spacing?.paddingLeft) style.paddingLeft = spacing.paddingLeft;
  if (spacing?.paddingRight) style.paddingRight = spacing.paddingRight;
  if (spacing?.gap) style.gap = spacing.gap;

  return style;
}

function getButtonClass(style?: ButtonStyle) {
  const variant = style?.variant ?? "primary";
  const size = style?.size ?? "medium";
  return ["button", "button-" + variant, size !== "medium" ? "button-" + size : ""]
    .filter(Boolean)
    .join(" ");
}

export function Story(block: Block & { type: "story" }) {
  const isProduct = Boolean(block.tags?.length) || block.title === "MagicBooth";
  const imagePosition = block.imagePosition ?? "right";
  const layoutClass = block.layout === "stacked" ? " stacked" : "";
  const sectionId = isProduct ? "product" : "about";
  const sectionClass = isProduct ? "magicbooth" : "story-section";

  return (
    <section id={sectionId} className={"section-shell " + sectionClass} style={getStyle(block)}>
      <div className={"story-layout" + layoutClass + (imagePosition === "left" ? " image-left" : "")}>
        <div className="story-copy">
          {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
          {block.title && (
            <h2>
              {isProduct ? <>Magic<span>Booth</span></> : block.title}
            </h2>
          )}
          {block.subtitle && <p className="story-subtitle">{block.subtitle}</p>}
          {block.body && <p className="muted-copy">{block.body}</p>}

          {block.tags?.length ? (
            <div className="tag-row">
              {block.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          ) : null}

          {(block.cta || block.secondaryCta) && (
            <div className="story-actions">
              {block.cta && <a className={getButtonClass(block.cta.style)} href={block.cta.href}>{block.cta.label}</a>}
              {block.secondaryCta && <a className={getButtonClass(block.secondaryCta.style)} href={block.secondaryCta.href}>{block.secondaryCta.label}</a>}
            </div>
          )}
        </div>

        <div className={"story-visual" + (isProduct ? " product-visual" : "")}>
          {block.image ? (
            <img src={block.image} alt={block.title || "AIBOX experience"} loading="lazy" decoding="async" />
          ) : isProduct ? (
            <>
              <span className="visual-label">MAGICBOOTH / HARDWARE</span>
              <MagicBoothModel className="story-booth-model" />
            </>
          ) : (
            <>
              <img src="/images/aibox-event-moment.webp" alt="Friends sharing a moment at a photobooth" loading="lazy" decoding="async" />
              <span className="visual-label">MADE FOR THE MOMENTS THAT MATTER</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
