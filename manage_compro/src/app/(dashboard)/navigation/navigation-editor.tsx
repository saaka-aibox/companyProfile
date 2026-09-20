"use client";

import { useState } from "react";
import type { Navigation } from "../../../types/content";

type NavigationItem = Navigation["items"][number];

export function NavigationEditor({ initialItems }: { initialItems: NavigationItem[] }) {
  const [items, setItems] = useState<NavigationItem[]>(initialItems);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, field: keyof NavigationItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    setItems((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveItems(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (items.some((item) => !item.label.trim() || !item.href.trim())) {
      setMessage("Nama dan alamat wajib diisi untuk setiap menu.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/v1/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Konfigurasi navbar gagal disimpan.");
      }

      setMessage("Konfigurasi navbar berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Konfigurasi navbar gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="navigation-editor" onSubmit={saveItems}>
      <div className="navigation-editor__header">
        <strong>Menu navbar</strong>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setItems((current) => [...current, { label: "", href: "" }])}
        >
          Tambah menu
        </button>
      </div>

      {items.length === 0 ? (
        <p className="navigation-editor__empty">Belum ada menu. Tambahkan menu baru untuk mulai mengatur navbar.</p>
      ) : (
        <div className="navigation-editor__list">
          {items.map((item, index) => (
            <div className="navigation-editor__row" key={`navigation-item-${index}`}>
              <label>
                Nama menu
                <input
                  aria-label={`Nama menu ${index + 1}`}
                  value={item.label}
                  onChange={(event) => updateItem(index, "label", event.target.value)}
                  placeholder="Contoh: Tentang Kami"
                />
              </label>
              <label>
                Alamat
                <input
                  aria-label={`Alamat menu ${index + 1}`}
                  value={item.href}
                  onChange={(event) => updateItem(index, "href", event.target.value)}
                  placeholder="Contoh: /about"
                />
              </label>
              <div className="navigation-editor__actions">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Pindah ke atas">↑</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Pindah ke bawah">↓</button>
                <button type="button" onClick={() => removeItem(index)} aria-label={`Hapus menu ${index + 1}`}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="navigation-editor__footer">
        <button className="button" type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan navbar"}
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </form>
  );
}
