"use client";

import { useState } from "react";

type AllowedIp = {
  id: string;
  ip: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
};

async function parseJson(response: Response) {
  return response.ok ? response.json() : Promise.reject(new Error("Request failed"));
}

export function AllowedIpsTable({ initialIps }: { initialIps: AllowedIp[] }) {
  const [ips, setIps] = useState<AllowedIp[]>(initialIps);
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const addIp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ip.trim() || saving) return;

    setSaving(true);
    try {
      const record = await fetch("/api/admin/allowed-ips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip: ip.trim(), label: label.trim() || undefined }),
      }).then(parseJson);
      setIps((current) => [record, ...current]);
      setIp("");
      setLabel("");
    } catch {
      alert("Gagal menambahkan IP. Periksa kembali input Anda.");
    } finally {
      setSaving(false);
    }
  };

  const toggleIp = async (record: AllowedIp) => {
    await fetch(`/api/admin/allowed-ips/${record.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !record.enabled }),
    }).then(parseJson);
    setIps((current) =>
      current.map((item) =>
        item.id === record.id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const removeIp = async (id: string) => {
    await fetch(`/api/admin/allowed-ips/${id}`, { method: "DELETE" }).then(parseJson);
    setIps((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="allowed-ips">
      <form className="allowed-ips__form" onSubmit={addIp}>
        <input
          type="text"
          placeholder="Contoh: 127.0.0.1 atau 192.168.1.10"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          aria-label="Alamat IP"
          required
        />
        <input
          type="text"
          placeholder="Label (opsional)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          aria-label="Label"
        />
        <button className="button" type="submit" disabled={saving}>
          Tambahkan
        </button>
      </form>

      {ips.length === 0 ? (
        <p>Belum ada IP yang diizinkan.</p>
      ) : (
        <ul className="allowed-ips__list">
          {ips.map((record) => (
            <li key={record.id}>
              <span className={`allowed-ips__chip${record.enabled ? "" : " allowed-ips__chip--disabled"}`}>
                {record.ip}
              </span>
              <small>{record.label || "Tanpa label"}</small>
              <button type="button" onClick={() => toggleIp(record)}>
                {record.enabled ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button type="button" onClick={() => removeIp(record.id)}>
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}