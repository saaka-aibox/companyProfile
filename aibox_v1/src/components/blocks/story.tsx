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

export function Story(block: Block & { type: "story" }) {
  const s = getStyle(block);
  const layout = block.layout || "split";
  const imagePosition = block.imagePosition || "right";
  const isStacked = layout === "stacked";
  const isShowcase = Boolean(block.tags && block.tags.length > 0) || block.title === "MagicBooth";

  return (
    <section id={isShowcase ? "product" : "about"} className={`section-shell ${isShowcase ? "magicbooth" : "story-section"}`} style={s}>
      <div
        className={isShowcase ? "product-intro" : "story"}
        style={{
          display: isStacked ? "flex" : "grid",
          gridTemplateColumns: isStacked ? undefined : (imagePosition === "left" ? "1fr 1fr" : "1fr 1fr"),
          flexDirection: isStacked ? (imagePosition === "left" ? "column-reverse" : "column") : undefined,
          gap: "4rem",
          alignItems: "center",
        }}
      >
        <div style={{ order: imagePosition === "left" ? 2 : 1 }}>
          <div className="story-copy">
            {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
            {block.title && (
              <h2>
                {block.title === "MagicBooth" ? (
                  <>
                    Magic<span>Booth</span>
                  </>
                ) : (
                  block.title
                )}
              </h2>
            )}
            {block.subtitle && <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "-0.5rem" }}>{block.subtitle}</p>}
            {isShowcase && <div className="orange-line" aria-hidden="true" />}
            {block.body && <p className="muted-copy">{block.body}</p>}

            {(block.cta || block.secondaryCta) && (
              <div className="story-actions" style={{ display: "flex", gap: "0.6rem", margin: "1.5rem 0" }}>
                {block.cta && (
                  <a className={`button ${getButtonClass(block.cta.style)}`} href={block.cta.href}>
                    {block.cta.label}
                  </a>
                )}
                {block.secondaryCta && (
                  <a className={`button ${getButtonClass(block.secondaryCta.style)}`} href={block.secondaryCta.href}>
                    {block.secondaryCta.label}
                  </a>
                )}
              </div>
            )}

            {block.tags && block.tags.length > 0 && (
              <div className="tag-row" style={{ marginTop: "1rem" }}>
                {block.tags.map((tag, idx) => (
                  <span key={idx}>✦ {tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ order: imagePosition === "left" ? 1 : 2 }}>
          {block.image ? (
            <div className="photo-placeholder photo-story">
              <img src={block.image} alt={block.title || "Story"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : isShowcase ? (
            <div
              className="photo-placeholder machine-placeholder"
              style={{
                borderRadius: "0.55rem",
                border: "1px solid var(--line)",
                background: "linear-gradient(135deg, #161828, #0e101a)",
                minHeight: "22rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%), linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: "12rem",
                  height: "16rem",
                  border: "2px solid rgba(255,123,0,0.3)",
                  borderRadius: "0.8rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "radial-gradient(circle at center, rgba(36,108,255,0.15), transparent 70%)",
                }}
              >
                <span style={{ fontSize: "2rem", color: "var(--orange)" }}>✦</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.5rem", letterSpacing: "-0.02em" }}>MagicBooth</span>
                <small style={{ color: "var(--muted)", fontSize: "0.6rem" }}>AI Photobooth Station</small>
              </div>
            </div>
          ) : (
            <div className="photo-placeholder photo-story">
              <span>AIBOX<br /><small style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 400 }}>Smart Photobooth Experience</small></span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}