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

export function Gallery(block: Block & { type: "gallery" }) {
  const s = getStyle(block);

  const titleText = block.title || "Captured Moments";
  const hasMoments = titleText.includes("Moments");

  return (
    <section id="moments" className="section-shell" style={s}>
      <div className="center-heading">
        {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
        <h2>
          {hasMoments ? (
            <>
              {titleText.replace("Moments", "")}
              <span style={{ color: "var(--orange)" }}>Moments</span>
            </>
          ) : (
            titleText
          )}
        </h2>
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      <div className="moments-grid">
        {block.items.map((item, index) => {
          const toneClass = item.tone ? ` ${item.tone}` : "";
          return (
            <article key={index} className={`moment-card${toneClass}`}>
              <div className="moment-photo photo-placeholder">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "0.3rem" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 75%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 75%)",
                        backgroundSize: "20px 20px",
                        opacity: 0.4,
                      }}
                    />
                    <span style={{ fontSize: "1.2rem", fontWeight: 700, opacity: 0.85 }}>{item.title}</span>
                  </div>
                )}
              </div>
              <div className="moment-meta">
                <div>
                  <strong style={{ fontSize: "0.75rem", display: "block" }}>{item.title}</strong>
                  {item.description && (
                    <small style={{ color: "var(--muted)", fontSize: "0.6rem" }}>{item.description}</small>
                  )}
                </div>
                {item.tag ? (
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)", border: "1px solid var(--line)", padding: "0.2rem 0.4rem", borderRadius: "0.2rem" }}>
                    {item.tag}
                  </span>
                ) : (
                  <i aria-hidden="true" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
