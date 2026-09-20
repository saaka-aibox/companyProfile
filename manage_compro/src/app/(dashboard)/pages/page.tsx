import Link from "next/link";
import { db } from "../../../lib/db";

export default async function PagesPage() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Kelola Halaman</h1>
          <p style={{ color: "var(--muted)", margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
            Buat, edit, susun blok, dan publikasikan konten website Anda.
          </p>
        </div>
        <Link className="button" href="/pages/new" style={{ background: "var(--blue)", color: "white" }}>
          + Buat Halaman Baru
        </Link>
      </div>

      <div className="admin-card">
        {pages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Belum ada halaman yang tersimpan.</p>
            <Link className="button" href="/pages/new" style={{ background: "var(--blue)", color: "white" }}>
              Mulai Buat Halaman Pertama
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pages.map((page) => {
              const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as unknown[];
              const isPublished = page.status === "PUBLISHED";
              const publicUrl = `http://localhost:3001/${page.slug === "home" ? "" : page.slug}`;

              return (
                <div
                  key={page.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    border: "1px solid var(--line)",
                    borderRadius: "0.5rem",
                    background: "rgba(255, 255, 255, 0.02)",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Link
                        href={`/pages/${page.id}`}
                        style={{ fontWeight: 700, fontSize: "1rem", color: "white" }}
                      >
                        {page.title}
                      </Link>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "0.2rem",
                          background: isPublished ? "#059669" : "#d97706",
                          color: "white",
                        }}
                      >
                        {page.status}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                      <span>Slug: <code>/{page.slug}</code></span>
                      <span>•</span>
                      <span>{blocks.length} blok konten</span>
                      <span>•</span>
                      <span>Diperbarui: {new Date(page.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                      style={{ background: "#1f2937", color: "var(--muted)", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                    >
                      Lihat Website ↗
                    </a>
                    <Link
                      href={`/pages/${page.id}`}
                      className="button"
                      style={{ background: "var(--blue)", color: "white", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                    >
                      Edit Konten
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
