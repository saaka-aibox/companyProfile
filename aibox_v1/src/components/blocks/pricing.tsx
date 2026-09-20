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

export function Pricing(block: Block & { type: "pricing" }) {
  const s = getStyle(block);
  const layout = block.layout || "grid";

  const titleText = block.title || "Own Your aibox";
  const hasAibox = titleText.toLowerCase().includes("aibox");

  return (
    <section id="pricing" className="pricing section-shell" style={s}>
      <div className="center-heading">
        {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
        <h2>
          {hasAibox ? (
            <>
              {titleText.replace(/aibox/i, "")}
              <span style={{ color: "var(--orange)" }}>aibox</span>
            </>
          ) : (
            titleText
          )}
        </h2>
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      <div
        className="plans-grid"
        style={{
          display: "grid",
          gridTemplateColumns: layout === "grid" ? "repeat(auto-fit, minmax(280px, 1fr))" : undefined,
          gap: block.spacing?.gap || "1rem",
        }}
      >
        {block.plans.map((plan, i) => (
          <article
            key={i}
            className={`plan-card${plan.featured ? " plan-featured" : ""}`}
            style={{
              position: "relative",
            }}
          >
            {plan.badge && (
              <span
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: plan.featured ? "var(--blue)" : "var(--orange)",
                  color: "white",
                  borderRadius: "0.25rem",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.5rem",
                  letterSpacing: "0.05em",
                }}
              >
                {plan.badge}
              </span>
            )}
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">
              {plan.price}
              {plan.period && <small> {plan.period}</small>}
            </div>
            {plan.description && (
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "1.2rem", lineHeight: 1.5 }}>
                {plan.description}
              </p>
            )}
            <ul style={{ marginBottom: "1.5rem" }}>
              {plan.features.map((feature, j) => (
                <li key={j}>✓ {feature}</li>
              ))}
            </ul>
            <a
              className={`button ${getButtonClass(plan.cta.style)}`}
              href={plan.cta.href}
              style={{ width: "100%", textAlign: "center" }}
            >
              {plan.cta.label}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}