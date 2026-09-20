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

export function Testimonials(block: Block & { type: "testimonials" }) {
  const s = getStyle(block);
  const layout = block.layout || "grid";

  return (
    <section className="content-section" style={s}>
      {block.title && <h2>{block.title}</h2>}
      {block.subtitle && <p style={{ color: "var(--muted)" }}>{block.subtitle}</p>}
      <div
        style={{
          display: layout === "carousel" ? "flex" : "grid",
          gridTemplateColumns: layout === "grid" ? "repeat(auto-fit, minmax(300px, 1fr))" : undefined,
          gap: block.spacing?.gap || "1rem",
          overflowX: layout === "carousel" ? "auto" : undefined,
        }}
      >
        {block.testimonials.map((t, i) => (
          <article
            key={i}
            className="content-card"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              flexShrink: layout === "carousel" ? 0 : undefined,
              minWidth: layout === "carousel" ? "300px" : undefined,
            }}
          >
            <p style={{ fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "1rem" }}>&ldquo;{t.quote}&rdquo;</p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {t.avatar && <img src={t.avatar} alt={t.author} style={{ width: "48px", height: "48px", borderRadius: "50%" }} />}
              <div>
                <strong>{t.author}</strong>
                {t.role && <br />}
                {t.role && <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t.role}</span>}
              </div>
            </div>
            {t.rating && (
              <div style={{ marginTop: "0.5rem" }}>
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}