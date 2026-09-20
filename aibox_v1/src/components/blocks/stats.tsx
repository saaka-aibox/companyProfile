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

export function Stats(block: Block & { type: "stats" }) {
  const s = getStyle(block);
  const layout = block.layout || "grid";

  return (
    <section className="content-section" style={s}>
      {block.title && <h2>{block.title}</h2>}
      {block.subtitle && <p style={{ color: "var(--muted)" }}>{block.subtitle}</p>}
      <div
        style={{
          display: layout === "inline" ? "flex" : "grid",
          gridTemplateColumns: layout === "grid" ? "repeat(auto-fit, minmax(150px, 1fr))" : undefined,
          gap: block.spacing?.gap || "1rem",
          justifyContent: layout === "inline" ? "center" : undefined,
          flexWrap: layout === "inline" ? "wrap" : undefined,
        }}
      >
        {block.stats.map((stat, i) => (
          <div key={i} style={{ textAlign: layout === "inline" ? "center" : "left" }}>
            {stat.icon && <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{stat.icon}</div>}
            <strong style={{ display: "block", fontSize: "2.5rem", letterSpacing: "-0.04em", marginBottom: "0.25rem" }}>{stat.value}</strong>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{stat.label}</span>
            {stat.description && <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{stat.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}