# Example components

Starter skeletons wired to the tokens in SKILL.md, using AI Box's real feature set and
flow (wave → generate → print). Adjust to actual copy/specs from the team — these fix the
*structure and class discipline*, not verbatim text.

Tailwind config addition (maps the CSS variables to utility classes):

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      "aibox-bg": "var(--aibox-bg)",
      "aibox-surface": "var(--aibox-surface)",
      "aibox-ink": "var(--aibox-ink)",
      "aibox-ink-muted": "var(--aibox-ink-muted)",
      "aibox-line": "var(--aibox-line)",
      "aibox-accent": "var(--aibox-accent)",
      "aibox-accent-2": "var(--aibox-accent-2)",
    },
    fontFamily: {
      sans: ["var(--font-sans)"],
      mono: ["var(--font-mono)"],
    },
    borderRadius: { aibox: "var(--aibox-radius)" },
  },
},
```

## Hero

```jsx
export function Hero({ ctaHref, media }) {
  return (
    <section className="bg-aibox-bg text-aibox-ink px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2 items-center">
        <div>
          <p className="font-mono lowercase tracking-wide text-sm text-aibox-ink-muted mb-4">
            ai photobooth
          </p>
          <h1 className="text-4xl md:text-5xl font-medium leading-tight mb-6">
            no button. just wave.
          </h1>
          <p className="text-aibox-ink-muted mb-8 max-w-sm">
            Hand-gesture capture and AI-generated frames — built for weddings, corporate
            events, and anywhere people want a photo worth posting.
          </p>
          <a
            href={ctaHref}
            className="inline-block bg-aibox-accent text-white px-6 py-3 rounded-aibox
                       font-medium hover:opacity-90 transition-opacity"
          >
            book for your event
          </a>
        </div>
        {/* real photo/video of the physical booth, mid-wave — never a clip-art camera icon */}
        <div className="rounded-aibox overflow-hidden border border-aibox-line">
          {media}
        </div>
      </div>
    </section>
  );
}
```

## Three-stage feature grid (Guardrails-style structure, AI Box's real flow)

```jsx
const stages = [
  {
    label: "wave",
    color: "#ff5a1f",
    copy: "Hand gesture detection fires the shutter — no button, no touchscreen germs.",
  },
  {
    label: "generate",
    color: "#1c3fff",
    copy: "Type a prompt and AI Box generates a one-of-a-kind frame, live.",
  },
  {
    label: "print",
    color: "#14140f",
    copy: "Walk away with a physical, shareable keepsake in seconds.",
  },
];

export function FeatureGrid3() {
  return (
    <section className="bg-aibox-surface px-6 py-20">
      <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
        {stages.map((s) => (
          <div key={s.label} className="border border-aibox-line rounded-aibox p-6">
            <div
              className="w-8 h-8 rounded-aibox mb-4"
              style={{ backgroundColor: s.color }}
            />
            <p className="font-mono lowercase tracking-wide text-sm mb-2">{s.label}</p>
            <p className="text-aibox-ink-muted leading-relaxed">{s.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

## Frame tile grid (teenage-engineering-style catalog, AI Box's generative frames)

```jsx
export function FrameTile({ code, colorHex, specLine }) {
  return (
    <div
      className="rounded-aibox p-6 flex flex-col justify-between h-40"
      style={{ backgroundColor: colorHex }}
    >
      <span className="font-mono lowercase tracking-wide text-white/90 text-sm">
        {code /* e.g. "frm–01" */}
      </span>
      <span className="text-white text-sm">
        {specLine /* e.g. "generated from prompt · ready in 4s" */}
      </span>
    </div>
  );
}
```

Use the same `FrameTile` component for rental package tiers on a pricing page — swap
`code` for the package name (`wedding`, `corporate`, `exhibition`) and `specLine` for what's
included. Keep every color reference tied to the token list or an explicit prop — no
ad-hoc hex values inside JSX beyond the tile grid's intentional per-tile color-blocking.