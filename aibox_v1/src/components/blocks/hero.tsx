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

function renderButton({ label, href, style }: { label: string; href: string; style?: ButtonStyle }) {
  return <a className={getButtonClass(style)} href={href}>{label}</a>;
}

export function Hero(block: Block & { type: "hero" }) {
  const s = getStyle(block);

  const titleParts = block.title.includes(",")
    ? block.title.split(",")
    : [block.title];

  return (
    <section className="hero section-shell" id="top" style={s}>
      <img
        className="hero-image"
        src={block.backgroundImage || "/images/aibox-photobooth-hero.webp"}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />

      <div className="hero-content">
        {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
        <h1>
          {titleParts.length > 1 ? (
            <>
              {titleParts[0]},<br />
              <em>{titleParts.slice(1).join(",").trim()}</em>
            </>
          ) : (
            block.title
          )}
        </h1>
        {block.body && <p className="hero-copy">{block.body}</p>}

        {(block.cta || block.secondaryCta) && (
          <div className="hero-actions">
            {block.cta && renderButton(block.cta)}
            {block.secondaryCta && renderButton(block.secondaryCta)}
          </div>
        )}

        {block.stats && block.stats.length > 0 && (
          <div className="hero-stats">
            {block.stats.map((stat, i) => (
              <span key={i}>
                <strong>{stat.value}</strong> {stat.label}
              </span>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
