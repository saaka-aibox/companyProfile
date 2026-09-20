"use client";

import type { Block, BlockType, ColorScheme, Spacing, ButtonStyle } from "@/types/content";
import { blockMeta } from "@/lib/block-meta";
import { useState } from "react";

interface BlockFormProps {
  block: Block;
  onChange: (block: Block) => void;
  onDelete: () => void;
  index: number;
}

const LAYOUT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "centered", label: "Centered" },
  { value: "split", label: "Split" },
  { value: "stacked", label: "Stacked" },
  { value: "grid", label: "Grid" },
  { value: "carousel", label: "Carousel" },
];

const BUTTON_VARIANTS = ["primary", "outline", "dark", "ghost"] as const;
const BUTTON_SIZES = ["small", "medium", "large"] as const;

function ColorSchemeInputs({ label, value, onChange }: { label: string; value?: ColorScheme; onChange: (v: ColorScheme) => void }) {
  const [bg, setBg] = useState(value?.background || "");
  const [text, setText] = useState(value?.text || "");
  const [accent, setAccent] = useState(value?.accent || "");
  const [border, setBorder] = useState(value?.border || "");

  const handleChange = () => onChange({ background: bg, text, accent, border });
  // handleChange is called inline

  return (
    <details className="form-section">
      <summary>{label}</summary>
      <div className="form-grid">
        <label>
          Background
          <input type="color" value={bg || "#090a12"} onChange={(e) => setBg(e.target.value)} />
        </label>
        <label>
          Text
          <input type="color" value={text || "#f7f7fb"} onChange={(e) => setText(e.target.value)} />
        </label>
        <label>
          Accent
          <input type="color" value={accent || "#ff7b00"} onChange={(e) => setAccent(e.target.value)} />
        </label>
        <label>
          Border
          <input type="color" value={border || "#292b3b"} onChange={(e) => setBorder(e.target.value)} />
        </label>
      </div>
    </details>
  );
}

function SpacingInputs({ label, value, onChange }: { label: string; value?: Spacing; onChange: (v: Spacing) => void }) {
  const [pt, setPt] = useState(value?.paddingTop || "");
  const [pb, setPb] = useState(value?.paddingBottom || "");
  const [pl, setPl] = useState(value?.paddingLeft || "");
  const [pr, setPr] = useState(value?.paddingRight || "");
  const [gap, setGap] = useState(value?.gap || "");

  const handleChange = () => onChange({ paddingTop: pt, paddingBottom: pb, paddingLeft: pl, paddingRight: pr, gap });
  // handleChange is called inline

  return (
    <details className="form-section">
      <summary>{label}</summary>
      <div className="form-grid">
        <label>Padding Top<input type="text" value={pt} onChange={(e) => setPt(e.target.value)} placeholder="2rem" /></label>
        <label>Padding Bottom<input type="text" value={pb} onChange={(e) => setPb(e.target.value)} placeholder="2rem" /></label>
        <label>Padding Left<input type="text" value={pl} onChange={(e) => setPl(e.target.value)} placeholder="2.5rem" /></label>
        <label>Padding Right<input type="text" value={pr} onChange={(e) => setPr(e.target.value)} placeholder="2.5rem" /></label>
        <label>Gap<input type="text" value={gap} onChange={(e) => setGap(e.target.value)} placeholder="1rem" /></label>
      </div>
    </details>
  );
}

function ButtonStyleInputs({ label, value, onChange }: { label: string; value?: ButtonStyle; onChange: (v: ButtonStyle) => void }) {
  const [variant, setVariant] = useState(value?.variant || "primary");
  const [size, setSize] = useState(value?.size || "medium");
  const [radius, setRadius] = useState(value?.borderRadius || "");

  const handleChange = () => onChange({ variant, size, borderRadius: radius });
  // handleChange is called inline

  return (
    <details className="form-section">
      <summary>{label}</summary>
      <div className="form-grid">
        <label>
          Variant
          <select value={variant} onChange={(e) => setVariant(e.target.value as "primary" | "outline" | "dark" | "ghost")}>
            {BUTTON_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label>
          Size
          <select value={size} onChange={(e) => setSize(e.target.value as "small" | "medium" | "large")}>
            {BUTTON_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Border Radius<input type="text" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="0.35rem" /></label>
      </div>
    </details>
  );
}

function LayoutSelect({ label, value, onChange, options = LAYOUT_OPTIONS }: { label: string; value?: string; onChange: (v: string) => void; options?: { value: string; label: string }[] }) {
  return (
    <label>
      {label}
      <select value={value || "default"} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function HeroForm({ block, onChange }: { block: Block & { type: "hero" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Eyebrow<input value={block.eyebrow || ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} /></label>
        <label>Title<input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} required /></label>
        <label>Body<textarea value={block.body || ""} onChange={(e) => onChange({ ...block, body: e.target.value })} /></label>
      </div>

      <details className="form-section">
        <summary>Primary CTA</summary>
        <div className="form-grid">
          <label>Label<input value={block.cta?.label || ""} onChange={(e) => onChange({ ...block, cta: { label: e.target.value, href: block.cta?.href || "#", style: block.cta?.style } })} /></label>
          <label>Href<input value={block.cta?.href || "#"} onChange={(e) => onChange({ ...block, cta: { label: block.cta?.label || "", href: e.target.value, style: block.cta?.style } })} /></label>
        </div>
        <ButtonStyleInputs label="Button Style" value={block.cta?.style} onChange={(s) => onChange({ ...block, cta: { label: block.cta?.label || "", href: block.cta?.href || "#", style: s } })} />
      </details>

      <details className="form-section">
        <summary>Secondary CTA</summary>
        <div className="form-grid">
          <label>Label<input value={block.secondaryCta?.label || ""} onChange={(e) => onChange({ ...block, secondaryCta: { label: e.target.value, href: block.secondaryCta?.href || "#", style: block.secondaryCta?.style } })} /></label>
          <label>Href<input value={block.secondaryCta?.href || "#"} onChange={(e) => onChange({ ...block, secondaryCta: { label: block.secondaryCta?.label || "", href: e.target.value, style: block.secondaryCta?.style } })} /></label>
        </div>
        <ButtonStyleInputs label="Button Style" value={block.secondaryCta?.style} onChange={(s) => onChange({ ...block, secondaryCta: { label: block.secondaryCta?.label || "", href: block.secondaryCta?.href || "#", style: s } })} />
      </details>

      <details className="form-section">
        <summary>Stats</summary>
        {(block.stats || []).map((stat, i) => (
          <div key={i} className="form-grid">
            <label>Value<input value={stat.value} onChange={(e) => { const s = [...(block.stats || [])]; s[i] = { ...s[i], value: e.target.value }; onChange({ ...block, stats: s }); }} /></label>
            <label>Label<input value={stat.label} onChange={(e) => { const s = [...(block.stats || [])]; s[i] = { ...s[i], label: e.target.value }; onChange({ ...block, stats: s }); }} /></label>
            <button type="button" onClick={() => { const s = [...(block.stats || [])]; s.splice(i, 1); onChange({ ...block, stats: s }); }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, stats: [...(block.stats || []), { label: "", value: "" }] })}>Add Stat</button>
      </details>

      <LayoutSelect label="Layout" value={block.layout} onChange={(v) => onChange({ ...block, layout: v as "default" | "centered" | "split" | "stacked" | "grid" | "carousel" })} />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />

      <div className="form-grid">
        <label>Background Image<input type="url" value={block.backgroundImage || ""} onChange={(e) => onChange({ ...block, backgroundImage: e.target.value })} /></label>
        <label>Background Video<input type="url" value={block.backgroundVideo || ""} onChange={(e) => onChange({ ...block, backgroundVideo: e.target.value })} /></label>
      </div>
    </div>
  );
}

function FeatureGridForm({ block, onChange }: { block: Block & { type: "featureGrid" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Eyebrow<input value={block.eyebrow || ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} /></label>
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
        <label>Columns
          <select value={block.columns || 3} onChange={(e) => onChange({ ...block, columns: parseInt(e.target.value) as 2 | 3 | 4 })}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>

      <details className="form-section">
        <summary>Features ({(block.features || []).length})</summary>
        {(block.features || []).map((feature, i) => (
          <div key={i} className="form-grid">
            <label>Title<input value={feature.title} onChange={(e) => { const f = [...block.features]; f[i] = { ...f[i], title: e.target.value }; onChange({ ...block, features: f }); }} /></label>
            <label>Description<textarea value={feature.description} onChange={(e) => { const f = [...block.features]; f[i] = { ...f[i], description: e.target.value }; onChange({ ...block, features: f }); }} /></label>
            <label>Icon<input value={feature.icon || ""} onChange={(e) => { const f = [...block.features]; f[i] = { ...f[i], icon: e.target.value }; onChange({ ...block, features: f }); }} placeholder="✨" /></label>
            <label>Image<input type="url" value={feature.image || ""} onChange={(e) => { const f = [...block.features]; f[i] = { ...f[i], image: e.target.value }; onChange({ ...block, features: f }); }} /></label>
            <button type="button" onClick={() => { const f = [...block.features]; f.splice(i, 1); onChange({ ...block, features: f }); }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, features: [...(block.features || []), { title: "", description: "" }] })}>Add Feature</button>
      </details>

      <details className="form-section">
        <summary>Interactive Steps ({(block.steps || []).length})</summary>
        {(block.steps || []).map((step, i) => (
          <div key={i} className="form-grid">
            <label>Step Number / Badge<input value={step.step} onChange={(e) => { const s = [...(block.steps || [])]; s[i] = { ...s[i], step: e.target.value }; onChange({ ...block, steps: s }); }} placeholder="1" /></label>
            <label>Title<input value={step.title} onChange={(e) => { const s = [...(block.steps || [])]; s[i] = { ...s[i], title: e.target.value }; onChange({ ...block, steps: s }); }} /></label>
            <label>Subtitle<input value={step.subtitle || ""} onChange={(e) => { const s = [...(block.steps || [])]; s[i] = { ...s[i], subtitle: e.target.value }; onChange({ ...block, steps: s }); }} /></label>
            <label>Icon<input value={step.icon || ""} onChange={(e) => { const s = [...(block.steps || [])]; s[i] = { ...s[i], icon: e.target.value }; onChange({ ...block, steps: s }); }} placeholder="✦" /></label>
            <button type="button" onClick={() => { const s = [...(block.steps || [])]; s.splice(i, 1); onChange({ ...block, steps: s }); }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, steps: [...(block.steps || []), { step: String((block.steps?.length || 0) + 1), title: "" }] })}>Add Step</button>
      </details>

      <LayoutSelect label="Layout" value={block.layout} onChange={(v) => onChange({ ...block, layout: v as "default" | "centered" | "split" | "stacked" | "grid" | "carousel" })} />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function CtaForm({ block, onChange }: { block: Block & { type: "cta" }; onChange: (b: Block) => void }) {
  const currentLabel = block.label || block.cta?.label || "";
  const currentHref = block.href || block.cta?.href || "#";

  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} required /></label>
        <label>Body<textarea value={block.body || ""} onChange={(e) => onChange({ ...block, body: e.target.value })} /></label>
        <label>CTA Label<input value={currentLabel} onChange={(e) => onChange({ ...block, label: e.target.value, cta: { ...(block.cta || {}), label: e.target.value, href: currentHref } })} required /></label>
        <label>CTA Href<input value={currentHref} onChange={(e) => onChange({ ...block, href: e.target.value, cta: { ...(block.cta || {}), label: currentLabel, href: e.target.value } })} required /></label>
      </div>

      <ButtonStyleInputs label="Button Style" value={block.style || block.cta?.style} onChange={(s) => onChange({ ...block, style: s, cta: { ...(block.cta || {}), label: currentLabel, href: currentHref, style: s } })} />
      <LayoutSelect label="Layout" value={block.layout} onChange={(v) => onChange({ ...block, layout: v as "default" | "centered" | "split" | "stacked" | "grid" | "carousel" })} />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function ContactFormForm({ block, onChange }: { block: Block & { type: "contactForm" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
        <label>Email<input type="email" value={block.email || ""} onChange={(e) => onChange({ ...block, email: e.target.value })} /></label>
      </div>

<details className="form-section">
        <summary>Custom Fields</summary>
        {(block.fields?.custom || []).map((field, i) => {
            const currentFields = block.fields || { name: "", email: "", message: "", custom: [] };
            const customArray = currentFields.custom || [];
            return (
              <div key={i} className="form-grid">
                <label>Label<input value={field.label} onChange={(e) => { const f = [...customArray]; f[i] = { ...f[i], label: e.target.value }; onChange({ ...block, fields: { ...currentFields, custom: f } }); }} /></label>
                <label>Type
                  <select value={field.type} onChange={(e) => { const f = [...customArray]; f[i] = { ...f[i], type: e.target.value as "text" | "email" | "textarea" | "select" }; onChange({ ...block, fields: { ...currentFields, custom: f } }); }}>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                  </select>
                </label>
                <label>Required<input type="checkbox" checked={field.required} onChange={(e) => { const f = [...customArray]; f[i] = { ...f[i], required: e.target.checked }; onChange({ ...block, fields: { ...currentFields, custom: f } }); }} /></label>
                <label>Options (comma separated)<input value={field.options?.join(", ") || ""} onChange={(e) => { const f = [...customArray]; f[i] = { ...f[i], options: e.target.value.split(",").map((s) => s.trim()) }; onChange({ ...block, fields: { ...currentFields, custom: f } }); }} /></label>
                <button type="button" onClick={() => { const f = [...customArray]; f.splice(i, 1); onChange({ ...block, fields: { ...currentFields, custom: f } }); }}>Remove</button>
              </div>
            );
          })}
        <button type="button" onClick={() => { const currentFields = block.fields || { name: "", email: "", message: "", custom: [] }; onChange({ ...block, fields: { name: currentFields.name, email: currentFields.email, message: currentFields.message, custom: [...(currentFields.custom || []), { label: "", type: "text" }] } }); }}>Add Custom Field</button>
      </details>

      <LayoutSelect label="Layout" value={block.layout} onChange={(v) => onChange({ ...block, layout: v as "default" | "centered" | "split" | "stacked" | "grid" | "carousel" })} />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
      <ButtonStyleInputs label="Submit Button Style" value={block.buttonStyle} onChange={(s) => onChange({ ...block, buttonStyle: s })} />
    </div>
  );
}

function TestimonialsForm({ block, onChange }: { block: Block & { type: "testimonials" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
      </div>

      <details className="form-section">
        <summary>Testimonials</summary>
        {(block.testimonials || []).map((t, i) => (
          <div key={i} className="form-grid">
            <label>Quote<textarea value={t.quote} onChange={(e) => { const t2 = [...block.testimonials]; t2[i] = { ...t2[i], quote: e.target.value }; onChange({ ...block, testimonials: t2 }); }} /></label>
            <label>Author<input value={t.author} onChange={(e) => { const t2 = [...block.testimonials]; t2[i] = { ...t2[i], author: e.target.value }; onChange({ ...block, testimonials: t2 }); }} /></label>
            <label>Role<input value={t.role || ""} onChange={(e) => { const t2 = [...block.testimonials]; t2[i] = { ...t2[i], role: e.target.value }; onChange({ ...block, testimonials: t2 }); }} /></label>
            <label>Avatar<input type="url" value={t.avatar || ""} onChange={(e) => { const t2 = [...block.testimonials]; t2[i] = { ...t2[i], avatar: e.target.value }; onChange({ ...block, testimonials: t2 }); }} /></label>
            <label>Rating<input type="number" min={1} max={5} value={t.rating || 5} onChange={(e) => { const t2 = [...block.testimonials]; t2[i] = { ...t2[i], rating: parseInt(e.target.value) }; onChange({ ...block, testimonials: t2 }); }} /></label>
            <button type="button" onClick={() => { const t2 = [...block.testimonials]; t2.splice(i, 1); onChange({ ...block, testimonials: t2 }); }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, testimonials: [...block.testimonials, { quote: "", author: "", rating: 5 }] })}>Add Testimonial</button>
      </details>

      <LayoutSelect
        label="Layout"
        value={block.layout}
        onChange={(v) => onChange({ ...block, layout: v as "carousel" | "grid" | "masonry" })}
        options={[
          { value: "carousel", label: "Carousel" },
          { value: "grid", label: "Grid" },
          { value: "masonry", label: "Masonry" },
        ]}
      />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function PricingForm({ block, onChange }: { block: Block & { type: "pricing" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
      </div>

      <details className="form-section">
        <summary>Plans</summary>
        {(block.plans || []).map((plan, i) => (
          <div key={i} className="form-section">
            <div className="form-grid">
              <label>Name<input value={plan.name} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], name: e.target.value }; onChange({ ...block, plans: p }); }} /></label>
              <label>Price<input value={plan.price} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], price: e.target.value }; onChange({ ...block, plans: p }); }} /></label>
              <label>Period<input value={plan.period || "/month"} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], period: e.target.value }; onChange({ ...block, plans: p }); }} /></label>
              <label>Featured<input type="checkbox" checked={plan.featured} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], featured: e.target.checked }; onChange({ ...block, plans: p }); }} /></label>
              <label>Badge<input value={plan.badge || ""} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], badge: e.target.value }; onChange({ ...block, plans: p }); }} /></label>
            </div>
            <label>Description<textarea value={plan.description || ""} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], description: e.target.value }; onChange({ ...block, plans: p }); }} /></label>
            <label>Features (one per line)<textarea value={plan.features.join("\n")} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }; onChange({ ...block, plans: p }); }} /></label>
            <div className="form-grid">
              <label>CTA Label<input value={plan.cta.label} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], cta: { ...p[i].cta, label: e.target.value } }; onChange({ ...block, plans: p }); }} /></label>
              <label>CTA Href<input value={plan.cta.href} onChange={(e) => { const p = [...block.plans]; p[i] = { ...p[i], cta: { ...p[i].cta, href: e.target.value } }; onChange({ ...block, plans: p }); }} /></label>
            </div>
            <ButtonStyleInputs label="CTA Button Style" value={plan.cta.style} onChange={(s) => { const p = [...block.plans]; p[i] = { ...p[i], cta: { ...p[i].cta, style: s } }; onChange({ ...block, plans: p }); }} />
            <button type="button" onClick={() => { const p = [...block.plans]; p.splice(i, 1); onChange({ ...block, plans: p }); }}>Remove Plan</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, plans: [...block.plans, { name: "", price: "", period: "/month", features: [], cta: { label: "Get Started", href: "#" } }] })}>Add Plan</button>
      </details>

      <LayoutSelect
        label="Layout"
        value={block.layout}
        onChange={(v) => onChange({ ...block, layout: v as "grid" | "carousel" })}
        options={[
          { value: "grid", label: "Grid" },
          { value: "carousel", label: "Carousel" },
        ]}
      />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function StatsForm({ block, onChange }: { block: Block & { type: "stats" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
      </div>

      <details className="form-section">
        <summary>Stats</summary>
        {(block.stats || []).map((stat, i) => (
          <div key={i} className="form-grid">
            <label>Value<input value={stat.value} onChange={(e) => { const s = [...block.stats]; s[i] = { ...s[i], value: e.target.value }; onChange({ ...block, stats: s }); }} /></label>
            <label>Label<input value={stat.label} onChange={(e) => { const s = [...block.stats]; s[i] = { ...s[i], label: e.target.value }; onChange({ ...block, stats: s }); }} /></label>
            <label>Description<input value={stat.description || ""} onChange={(e) => { const s = [...block.stats]; s[i] = { ...s[i], description: e.target.value }; onChange({ ...block, stats: s }); }} /></label>
            <label>Icon<input value={stat.icon || ""} onChange={(e) => { const s = [...block.stats]; s[i] = { ...s[i], icon: e.target.value }; onChange({ ...block, stats: s }); }} placeholder="📈" /></label>
            <button type="button" onClick={() => { const s = [...block.stats]; s.splice(i, 1); onChange({ ...block, stats: s }); }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, stats: [...block.stats, { label: "", value: "" }] })}>Add Stat</button>
      </details>

      <LayoutSelect
        label="Layout"
        value={block.layout}
        onChange={(v) => onChange({ ...block, layout: v as "grid" | "inline" })}
        options={[
          { value: "grid", label: "Grid" },
          { value: "inline", label: "Inline" },
        ]}
      />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function StoryForm({ block, onChange }: { block: Block & { type: "story" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Eyebrow<input value={block.eyebrow || ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} /></label>
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
        <label>Tags (comma separated)<input value={block.tags?.join(", ") || ""} onChange={(e) => onChange({ ...block, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="AI Gesture, Instant Print, Custom Themes" /></label>
      </div>
      <div className="form-grid">
        <label>Body<textarea value={block.body || ""} onChange={(e) => onChange({ ...block, body: e.target.value })} /></label>
        <label>Image<input type="url" value={block.image || ""} onChange={(e) => onChange({ ...block, image: e.target.value })} /></label>
        <label>Image Position
          <select value={block.imagePosition || "right"} onChange={(e) => onChange({ ...block, imagePosition: e.target.value as "left" | "right" })}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>

      <details className="form-section">
        <summary>Primary CTA</summary>
        <div className="form-grid">
          <label>Label<input value={block.cta?.label || ""} onChange={(e) => onChange({ ...block, cta: { label: e.target.value, href: block.cta?.href || "#", style: block.cta?.style } })} /></label>
          <label>Href<input value={block.cta?.href || "#"} onChange={(e) => onChange({ ...block, cta: { label: block.cta?.label || "", href: e.target.value, style: block.cta?.style } })} /></label>
        </div>
        <ButtonStyleInputs label="Button Style" value={block.cta?.style} onChange={(s) => onChange({ ...block, cta: { label: block.cta?.label || "", href: block.cta?.href || "#", style: s } })} />
      </details>

      <details className="form-section">
        <summary>Secondary CTA</summary>
        <div className="form-grid">
          <label>Label<input value={block.secondaryCta?.label || ""} onChange={(e) => onChange({ ...block, secondaryCta: { label: e.target.value, href: block.secondaryCta?.href || "#", style: block.secondaryCta?.style } })} /></label>
          <label>Href<input value={block.secondaryCta?.href || "#"} onChange={(e) => onChange({ ...block, secondaryCta: { label: block.secondaryCta?.label || "", href: e.target.value, style: block.secondaryCta?.style } })} /></label>
        </div>
        <ButtonStyleInputs label="Button Style" value={block.secondaryCta?.style} onChange={(s) => onChange({ ...block, secondaryCta: { label: block.secondaryCta?.label || "", href: block.secondaryCta?.href || "#", style: s } })} />
      </details>

      <LayoutSelect
        label="Layout"
        value={block.layout}
        onChange={(v) => onChange({ ...block, layout: v as "split" | "stacked" })}
        options={[
          { value: "split", label: "Split" },
          { value: "stacked", label: "Stacked" },
        ]}
      />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function DividerForm({ block, onChange }: { block: Block & { type: "divider" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Style
          <select value={block.style || "solid"} onChange={(e) => onChange({ ...block, style: e.target.value as "solid" | "dashed" | "dotted" })}>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </label>
        <label>Color<input type="color" value={block.color || "#292b3b"} onChange={(e) => onChange({ ...block, color: e.target.value })} /></label>
      </div>
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function FaqForm({ block, onChange }: { block: Block & { type: "faq" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Eyebrow<input value={block.eyebrow || ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} /></label>
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
      </div>

      <details className="form-section">
        <summary>FAQ Items ({(block.items || []).length})</summary>
        {(block.items || []).map((item, i) => (
          <div key={i} className="form-grid">
            <label>Question<input value={item.question} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], question: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <label>Answer<textarea value={item.answer} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], answer: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <button type="button" onClick={() => { const it = [...(block.items || [])]; it.splice(i, 1); onChange({ ...block, items: it }); }}>Remove Item</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, items: [...(block.items || []), { question: "", answer: "" }] })}>Add FAQ Item</button>
      </details>

      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

function GalleryForm({ block, onChange }: { block: Block & { type: "gallery" }; onChange: (b: Block) => void }) {
  return (
    <div className="block-form">
      <div className="form-grid">
        <label>Eyebrow<input value={block.eyebrow || ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} /></label>
        <label>Title<input value={block.title || ""} onChange={(e) => onChange({ ...block, title: e.target.value })} /></label>
        <label>Subtitle<input value={block.subtitle || ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} /></label>
        <label>Columns
          <select value={block.columns || 3} onChange={(e) => onChange({ ...block, columns: parseInt(e.target.value) as 2 | 3 | 4 })}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>

      <details className="form-section">
        <summary>Gallery Items ({(block.items || []).length})</summary>
        {(block.items || []).map((item, i) => (
          <div key={i} className="form-grid">
            <label>Title<input value={item.title} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], title: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <label>Tag / Category<input value={item.tag || ""} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], tag: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <label>Tone
              <select value={item.tone || "default"} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], tone: e.target.value as "gold" | "purple" | "pink" | "blue" | "default" }; onChange({ ...block, items: it }); }}>
                <option value="default">Default</option>
                <option value="gold">Gold</option>
                <option value="purple">Purple</option>
                <option value="pink">Pink</option>
                <option value="blue">Blue</option>
              </select>
            </label>
            <label>Image URL<input type="url" value={item.image || ""} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], image: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <label>Description<input value={item.description || ""} onChange={(e) => { const it = [...(block.items || [])]; it[i] = { ...it[i], description: e.target.value }; onChange({ ...block, items: it }); }} /></label>
            <button type="button" onClick={() => { const it = [...(block.items || [])]; it.splice(i, 1); onChange({ ...block, items: it }); }}>Remove Item</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...block, items: [...(block.items || []), { title: "", tone: "default" }] })}>Add Gallery Item</button>
      </details>

      <LayoutSelect label="Layout" value={block.layout} onChange={(v) => onChange({ ...block, layout: v as "grid" | "carousel" })} options={[{ value: "grid", label: "Grid" }, { value: "carousel", label: "Carousel" }]} />
      <ColorSchemeInputs label="Color Scheme" value={block.colorScheme} onChange={(v) => onChange({ ...block, colorScheme: v })} />
      <SpacingInputs label="Spacing" value={block.spacing} onChange={(v) => onChange({ ...block, spacing: v })} />
    </div>
  );
}

const formComponents: Record<BlockType, React.ComponentType<{ block: Block; onChange: (b: Block) => void }>> = {
  hero: HeroForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  featureGrid: FeatureGridForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  cta: CtaForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  contactForm: ContactFormForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  testimonials: TestimonialsForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  pricing: PricingForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  stats: StatsForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  story: StoryForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  gallery: GalleryForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  faq: FaqForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
  divider: DividerForm as React.ComponentType<{ block: Block; onChange: (b: Block) => void }>,
};

export function BlockForm({ block, onChange, onDelete, index }: BlockFormProps) {
  const Component = formComponents[block.type];
  const meta = blockMeta[block.type];

  return (
    <div className="block-editor" style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "1.5rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>{meta?.icon || "📦"} {meta?.label || block.type} <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>#{index + 1}</span></h3>
        <button type="button" onClick={onDelete} style={{ background: "var(--orange)", color: "white", border: "none", borderRadius: "0.3rem", padding: "0.4rem 0.75rem", cursor: "pointer" }}>Delete Block</button>
      </div>
      {Component ? <Component block={block} onChange={onChange} /> : <p>No form available for {block.type}</p>}
    </div>
  );
}