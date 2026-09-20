import type { Block, ButtonStyle } from "../../types/content";

function getStyle(block: Block) {
  const style: React.CSSProperties & Record<string, string | undefined> = {};
  if (block.colorScheme) {
    if (block.colorScheme.background) style.backgroundColor = block.colorScheme.background;
    if (block.colorScheme.text) style.color = block.colorScheme.text;
    if (block.colorScheme.accent) style["--accent"] = block.colorScheme.accent;
    if (block.colorScheme.border) style.borderColor = block.colorScheme.border;
  }
  if (block.spacing) {
    if (block.spacing.paddingTop) style.paddingTop = block.spacing.paddingTop;
    if (block.spacing.paddingBottom) style.paddingBottom = block.spacing.paddingBottom;
    if (block.spacing.paddingLeft) style.paddingLeft = block.spacing.paddingLeft;
    if (block.spacing.paddingRight) style.paddingRight = block.spacing.paddingRight;
    if (block.spacing.gap) style.gap = block.spacing.gap;
  }
  return style;
}

function getButtonClass(style?: ButtonStyle) {
  const variant = style?.variant || "primary";
  const size = style?.size || "medium";
  const classes = ["button"];
  if (variant !== "primary") classes.push(`button-${variant}`);
  if (size !== "medium") classes.push(`button-${size}`);
  return classes.join(" ");
}

export function ContactForm(block: Block & { type: "contactForm" }) {
  const s = getStyle(block);
  const action = block.email ? `mailto:${block.email}` : "mailto:contact@aibox.id";

  const titleText = block.title || "Ready to Experience MagicBooth?";
  const hasMagicBooth = titleText.includes("MagicBooth");

  return (
    <section id="contact" className="contact section-shell" style={s}>
      <div className="center-heading">
        <p className="section-kicker">✦ Let&apos;s Connect</p>
        <h2>
          {hasMagicBooth ? (
            <>
              {titleText.replace("MagicBooth?", "").replace("MagicBooth", "")}
              <span style={{ color: "var(--orange)" }}>MagicBooth?</span>
            </>
          ) : (
            titleText
          )}
        </h2>
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      <div className="contact-layout">
        <div className="contact-details">
          <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "white" }}>AIBOX Studio &amp; Experience</h3>
          <p style={{ lineHeight: 1.8, marginBottom: "1.5rem" }}>
            Experience the future of event photobooths in person or arrange a virtual demo with our product team.
          </p>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: "0.8rem" }}>📍 Headquarter</strong>
              <span>Jakarta, Indonesia</span>
            </div>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: "0.8rem" }}>✉️ Direct Inquiries</strong>
              <span>{block.email || "contact@aibox.id"}</span>
            </div>
            <div>
              <strong style={{ color: "white", display: "block", fontSize: "0.8rem" }}>⏰ Business Hours</strong>
              <span>Mon - Fri: 09:00 - 18:00 WIB</span>
            </div>
          </div>

          <div className="gesture-control">
            <div className="gesture-status is-active">
              <span />
              <strong style={{ color: "white", fontSize: "0.75rem" }}>AI Gesture Engine Online</strong>
            </div>
            <small style={{ color: "var(--muted)", fontSize: "0.65rem", display: "block", marginTop: "0.4rem" }}>
              MediaPipe Gesture Recognition Active &amp; Tested
            </small>
          </div>
        </div>

        <form className="contact-form" action={action} method="post" encType="text/plain">
          <label>
            Full Name
            <input name="name" required placeholder="John Doe" />
          </label>
          <label>
            Email Address
            <input name="email" type="email" required placeholder="john@example.com" />
          </label>
          <label>
            Event Type / Package
            <input name="subject" placeholder="Wedding / Corporate / Pro Plan" />
          </label>
          <label>
            Message / Details
            <textarea name="message" rows={4} required placeholder="Tell us about your event date, location, or unit requirements..." />
          </label>
          <button className={`button ${getButtonClass(block.buttonStyle)}`} type="submit">
            Send Inquiry
          </button>
        </form>
      </div>
    </section>
  );
}