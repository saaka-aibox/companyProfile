"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlockForm } from "@/components/editor/block-form";
import { BlockList } from "@/components/editor/block-list";
import { BlockPicker } from "@/components/editor/block-picker";
import type { Block, Page } from "@/types/content";

interface PageEditorProps {
  page: Page;
}

export function PageEditorClient({ page }: PageEditorProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(page.blocks || []);
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description || "");
  const [slug, setSlug] = useState(page.slug);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    page.status?.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
  );
  const [showBlockForm, setShowBlockForm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleAddBlock = (block: Block) => {
    setBlocks((prev) => [...prev, block]);
    setShowBlockForm(blocks.length);
  };

  const handleReorder = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    if (showBlockForm === index) setShowBlockForm(null);
    else if (showBlockForm !== null && showBlockForm > index) setShowBlockForm(showBlockForm - 1);
  };

  const handleEditBlock = (index: number) => {
    setShowBlockForm(showBlockForm === index ? null : index);
  };

  const handleBlockChange = (index: number, updatedBlock: Block) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updatedBlock : b)));
  };

  const handleSave = async (overrideStatus?: "DRAFT" | "PUBLISHED") => {
    setSaving(true);
    setMessage(null);
    const targetStatus = overrideStatus || status;

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          slug,
          blocks,
          status: targetStatus,
        }),
      });

      if (response.ok) {
        if (overrideStatus) setStatus(overrideStatus);
        setMessage({ text: "✓ Perubahan berhasil disimpan!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        // Flatten Zod fieldErrors into a readable list
        const fieldErrors = err.details?.fieldErrors ?? {};
        const errorLines: string[] = [];
        for (const [field, msgs] of Object.entries(fieldErrors)) {
          if (Array.isArray(msgs)) {
            errorLines.push(`• ${field}: ${(msgs as string[]).join(", ")}`);
          }
        }
        const detailText = errorLines.length > 0
          ? `\n${errorLines.slice(0, 6).join("\n")}`
          : "";
        setMessage({
          text: `✗ ${err.error || "Gagal menyimpan perubahan."}${detailText}`,
          type: "error",
        });
      }
    } catch {
      setMessage({ text: "✗ Terjadi kesalahan saat menyimpan.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // First save all current changes
      const saveRes = await fetch(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          slug,
          blocks,
          status: "PUBLISHED",
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Gagal menyimpan data sebelum publish.");
      }

      // Then trigger publish webhook and revalidate
      const pubRes = await fetch(`/api/admin/pages/${page.id}/publish`, {
        method: "POST",
      });

      if (pubRes.ok) {
        setStatus("PUBLISHED");
        setMessage({ text: "Halaman berhasil dipublikasikan ke website publik!", type: "success" });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ text: "Gagal mempublikasikan halaman.", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat publish.";
      setMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus halaman "${title}"?\nTindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/pages");
      } else {
        alert("Gagal menghapus halaman.");
      }
    } catch {
      alert("Terjadi kesalahan saat menghapus halaman.");
    }
  };

  const publicUrl = `http://localhost:3001/${slug === "home" ? "" : slug}`;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Editor Halaman</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.2rem 0.5rem",
                borderRadius: "0.25rem",
                background: status === "PUBLISHED" ? "#059669" : "#d97706",
                color: "white",
              }}
            >
              {status}
            </span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", color: "var(--blue)", textDecoration: "underline" }}
            >
              Lihat di Website ↗
            </a>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleDeletePage}
            className="button"
            style={{ background: "#dc2626", color: "white" }}
          >
            Hapus Halaman
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="button"
            disabled={saving}
            style={{ background: "#374151", color: "white" }}
          >
            {saving ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="button"
            disabled={saving}
            style={{ background: "var(--orange)", color: "white" }}
          >
            {saving ? "Memproses..." : "Publish ke Website"}
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.4rem",
            marginBottom: "1.5rem",
            background: message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            border: `1px solid ${message.type === "success" ? "#10b981" : "#ef4444"}`,
            color: message.type === "success" ? "#34d399" : "#f87171",
            fontSize: "0.85rem",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Basic page settings card */}
      <div className="admin-card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "1rem" }}>Informasi Halaman</h2>
        <div className="form-grid" style={{ marginBottom: "1rem" }}>
          <label>
            Judul Halaman (Title)
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Slug URL
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
        </div>
        <label style={{ display: "block" }}>
          Deskripsi (SEO)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", minHeight: "70px" }}
          />
        </label>
        <div style={{ marginTop: "1rem" }}>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
              style={{ marginLeft: "0.5rem" }}
            >
              <option value="DRAFT">DRAFT (Hanya terlihat di preview)</option>
              <option value="PUBLISHED">PUBLISHED (Aktif di website publik)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Blocks section */}
      <div className="admin-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Daftar Blok ({blocks.length})</h2>
            <small style={{ color: "var(--muted)" }}>Klik blok untuk mengedit isi kontennya</small>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Tambah Blok:</span>
            <BlockPicker onAdd={handleAddBlock} />
          </div>
        </div>

        <BlockList
          blocks={blocks}
          onReorder={handleReorder}
          onDelete={handleDeleteBlock}
          onEdit={handleEditBlock}
        />
      </div>

      {/* Block editing form */}
      {showBlockForm !== null && blocks[showBlockForm] && (
        <div className="admin-card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              Edit Blok #{showBlockForm + 1}: {blocks[showBlockForm].type}
            </h2>
            <button
              type="button"
              onClick={() => setShowBlockForm(null)}
              className="button"
              style={{ background: "#374151", padding: "0.3rem 0.8rem", fontSize: "0.75rem" }}
            >
              Tutup Editor Blok
            </button>
          </div>
          <BlockForm
            block={blocks[showBlockForm]}
            onChange={(b) => handleBlockChange(showBlockForm, b)}
            onDelete={() => handleDeleteBlock(showBlockForm)}
            index={showBlockForm}
          />
        </div>
      )}
    </section>
  );
}
