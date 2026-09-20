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

export function Faq(block: Block & { type: "faq" }) {
  const s = getStyle(block);

  return (
    <section id="faq" className="faq section-shell" style={s}>
      <div className="center-heading">
        {block.eyebrow && <p className="section-kicker">{block.eyebrow}</p>}
        {block.title && (
          <h2>
            {block.title.includes("Questions") ? (
              <>
                {block.title.replace("Questions", "")}
                <span style={{ color: "var(--blue)" }}>Questions</span>
              </>
            ) : (
              block.title
            )}
          </h2>
        )}
        {block.subtitle && <p>{block.subtitle}</p>}
      </div>

      <div className="faq-list">
        {block.items.map((item, index) => (
          <details key={index} open={index === 0}>
            <summary>
              {item.question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
