import type { CSSProperties } from "react";
import type { Block, ButtonStyle } from "../../types/content";
import { ContactEnquiryForm } from "./ContactEnquiryForm";

type ContactBlock = Block & { type: "contactForm" };

function getSectionStyle(block: ContactBlock): CSSProperties & Record<string, string | undefined> {
  const style: CSSProperties & Record<string, string | undefined> = {};
  const { colorScheme, spacing } = block;

  if (colorScheme?.background) style.backgroundColor = colorScheme.background;
  if (colorScheme?.text) style.color = colorScheme.text;
  if (colorScheme?.accent) style["--accent"] = colorScheme.accent;
  if (spacing?.paddingTop) style.paddingTop = spacing.paddingTop;
  if (spacing?.paddingBottom) style.paddingBottom = spacing.paddingBottom;
  if (spacing?.paddingLeft) style.paddingLeft = spacing.paddingLeft;
  if (spacing?.paddingRight) style.paddingRight = spacing.paddingRight;
  return style;
}

function getButtonClass(style?: ButtonStyle) {
  const variant = style?.variant ?? "primary";
  const size = style?.size ?? "medium";
  return ["button", variant !== "primary" && `button-${variant}`, size !== "medium" && `button-${size}`]
    .filter(Boolean)
    .join(" ");
}

export function ContactForm(block: ContactBlock) {
  const email = block.email || "contact@aibox.id";

  return (
    <section id="contact" className="contact-section section-shell" style={getSectionStyle(block)}>
      <div className="contact-heading">
        {block.title && (
          <h2>
            {block.title.includes("MagicBooth") ? (
              <>{block.title.replace("MagicBooth", "")}<span>MagicBooth</span></>
            ) : block.title}
          </h2>
        )}
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      <div className="contact-layout">
        <aside className="contact-details" aria-label="Contact details">
          <div className="contact-detail-card">
            <span className="contact-detail-label">EMAIL</span>
            <a href={`mailto:${email}`}>{email}</a>
          </div>
          <div className="contact-detail-card">
            <span className="contact-detail-label">PRODUCT</span>
            <strong>MagicBooth by AIBOX</strong>
          </div>
          <a className="contact-detail-card contact-playground-link" href="#playground">
            <span className="contact-detail-label">TRY IT FIRST</span>
            <strong>Explore the gesture playground <span aria-hidden="true">↗</span></strong>
          </a>
        </aside>

        <ContactEnquiryForm email={email} buttonClass={getButtonClass(block.buttonStyle)} />
      </div>
    </section>
  );
}
