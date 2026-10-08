import type { Block } from "../../types/content";

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

export function FeatureGrid(block: Block & { type: "featureGrid" }) {
  const s = getStyle(block);
  const columns = block.columns || 3;

  return (
    <section id="features" className="section-shell magicbooth" style={s}>
      <div className="booth-heading">
        {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
        {block.title && (
          <h3>
            {block.title.includes("MagicBooth") ? (
              <>Meet <span>MagicBooth</span></>
            ) : (
              block.title
            )}
          </h3>
        )}
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      {/* Feature cards */}
      <div className={`feature-grid cols-${columns}`}>
        {block.features.map((feature, i) => (
          <article key={i} className="feature-card">
            {feature.image ? (
              <div className="feature-image photo-placeholder">
                <img src={feature.image} alt={feature.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "0.3rem" }} />
              </div>
            ) : (
              <div className="feature-image photo-placeholder" />
            )}
            {feature.icon && <div className="feature-icon">{feature.icon}</div>}
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>

      {/* Steps journey bar */}
      {block.steps && block.steps.length > 0 && (
        <div className="steps-card">
          {block.steps.map((step, i) => (
            <div key={i} className="step">
              <span>{step.step}</span>
              <strong>{step.title}</strong>
              {step.subtitle && <small>{step.subtitle}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
