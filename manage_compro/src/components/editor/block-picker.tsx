"use client";

import { blockMeta } from "@/lib/block-meta";
import { blockTypes } from "@/schemas/block";
import type { Block, BlockType } from "@/types/content";

interface BlockPickerProps {
  onAdd: (block: Block) => void;
}

const defaultBlocks: Record<BlockType, Block> = {
  hero: { type: "hero", title: "Build what matters.", eyebrow: "AIBOX", body: "Kelola konten website Anda dari satu tempat.", cta: { label: "Hubungi kami", href: "#contact" } },
  featureGrid: { type: "featureGrid", title: "Platform yang fleksibel", features: [{ title: "Content API", description: "Konten terstruktur untuk website modern." }, { title: "Block editor", description: "Susun halaman tanpa mengubah kode." }] },
  cta: { type: "cta", title: "Siap memulai?", label: "Mulai sekarang", href: "#contact" },
  contactForm: { type: "contactForm", title: "Mari bekerja sama" },
  testimonials: { type: "testimonials", title: "Apa kata mereka", testimonials: [{ quote: "Produk yang luar biasa!", author: "Budi", role: "CEO", rating: 5 }] },
  pricing: { type: "pricing", title: "Harga yang transparan", plans: [{ name: "Starter", price: "Rp 99.000", period: "/bulan", features: ["Fitur dasar", "5 project"], cta: { label: "Mulai", href: "#" } }, { name: "Pro", price: "Rp 299.000", period: "/bulan", features: ["Semua fitur", "Unlimited project", "Prioritas support"], cta: { label: "Upgrade", href: "#" }, featured: true }] },
  stats: { type: "stats", title: "Angka berbicara", stats: [{ label: "Klien", value: "500+" }, { label: "Project", value: "1000+" }, { label: "Rating", value: "4.9/5" }] },
  story: { type: "story", title: "Cerita kami", body: "Kami dimulai dari keinginan untuk mempermudah manajemen konten." },
  gallery: { type: "gallery", title: "Galeri Foto", items: [{ title: "Momen Spesial", tone: "gold", description: "Dokumentasi event" }] },
  faq: { type: "faq", title: "Pertanyaan yang Sering Diajukan", items: [{ question: "Bagaimana cara kerja produk?", answer: "Sangat mudah dan intuitif." }] },
  divider: { type: "divider" },
};

export function BlockPicker({ onAdd }: BlockPickerProps) {
  return (
    <select
      aria-label="Pilih blok"
      defaultValue=""
      onChange={(e) => {
        const type = e.target.value as BlockType;
        if (type && defaultBlocks[type]) {
          onAdd({ ...defaultBlocks[type] });
          e.target.value = "";
        }
      }}
    >
      <option value="" disabled>Pilih blok</option>
      {blockTypes.map((type) => {
        const meta = blockMeta[type];
        return <option key={type} value={type}>{meta?.icon || "📦"} {meta?.label || type}</option>;
      })}
    </select>
  );
}