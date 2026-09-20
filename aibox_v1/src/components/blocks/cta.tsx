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

export function Cta(block: Block & { type: "cta" }) {
  const s = getStyle(block);

  return (
    <section className="content-cta" style={s}>
      <h2>{block.title}</h2>
      {block.body && <p style={{ color: "var(--muted)" }}>{block.body}</p>}
      <a className={getButtonClass(block.style)} href={block.href}>
        {block.label}
      </a>
    </section>
  );
}