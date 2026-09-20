import Link from "next/link";

export default function SettingsPage() {
  return (
    <section>
      <h1>Settings</h1>
      <div className="admin-card">
        <p>Pengaturan site dan Content API.</p>
        <p>
          <Link href="/settings/allowed-ips">Kelola IP yang diizinkan</Link>
        </p>
      </div>
    </section>
  );
}
