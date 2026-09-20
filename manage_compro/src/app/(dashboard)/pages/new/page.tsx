"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlockForm } from "@/components/editor/block-form";
import { BlockList } from "@/components/editor/block-list";
import { BlockPicker } from "@/components/editor/block-picker";
import type { Block } from "@/types/content";

const defaultBlocks: Block[] = [
  { type: "hero", title: "Build what matters.", eyebrow: "AIBOX", body: "Kelola konten website Anda dari satu tempat.", cta: { label: "Hubungi kami", href: "#contact" } },
];

export default function NewPagePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [showBlockForm, setShowBlockForm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const handleAddBlock = (block: Block) => {
    setBlocks([...blocks, block]);
    setShowBlockForm(blocks.length);
  };

  const handleReorder = (newBlocks: Block[]) => setBlocks(newBlocks);
  const handleDeleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    if (showBlockForm === index) setShowBlockForm(null);
    else if (showBlockForm !== null && showBlockForm > index) setShowBlockForm(showBlockForm - 1);
  };
  const handleEditBlock = (index: number) => setShowBlockForm(showBlockForm === index ? null : index);
  const handleBlockChange = (index: number, updatedBlock: Block) => setBlocks(blocks.map((b, i) => (i === index ? updatedBlock : b)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, slug, blocks }),
      });

      if (res.ok) {
        const page = await res.json();
        router.push(`/pages/${page.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        let errMsg = data.error || "Gagal membuat halaman baru.";
        if (data.details?.fieldErrors) {
          const fieldMsgs = Object.entries(data.details.fieldErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("; ");
          if (fieldMsgs) errMsg += ` (${fieldMsgs})`;
        }
        setError(errMsg);
      }
    } catch {
      setError("Terjadi kesalahan jaringan saat membuat halaman.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Buat Halaman Baru</h1>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.4rem",
            marginBottom: "1.5rem",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid #ef4444",
            color: "#f87171",
            fontSize: "0.85rem",
          }}
        >
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-card" style={{ marginBottom: "2rem" }}>
        <div className="form-grid">
          <label>
            Judul Halaman
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: About Us"
              required
            />
          </label>
          <label>
            Slug URL (otomatis dibuat)
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="about-us"
              required
            />
          </label>
        </div>
        <label style={{ display: "block", marginTop: "1rem" }}>
          Deskripsi SEO
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat halaman..."
            style={{ width: "100%", minHeight: "80px" }}
          />
        </label>
        <button type="submit" className="button" disabled={saving} style={{ marginTop: "1rem", background: "var(--blue)", color: "white" }}>
          {saving ? "Menyimpan..." : "Buat Halaman"}
        </button>
      </form>

      <div className="admin-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Blok Konten</h2>
          <BlockPicker onAdd={handleAddBlock} />
        </div>
        <BlockList blocks={blocks} onReorder={handleReorder} onDelete={handleDeleteBlock} onEdit={handleEditBlock} />
      </div>

      {showBlockForm !== null && (
        <div className="admin-card" style={{ marginBottom: "2rem" }}>
          <BlockForm block={blocks[showBlockForm]} onChange={(b) => handleBlockChange(showBlockForm, b)} onDelete={() => handleDeleteBlock(showBlockForm)} index={showBlockForm} />
        </div>
      )}
    </section>
  );
}