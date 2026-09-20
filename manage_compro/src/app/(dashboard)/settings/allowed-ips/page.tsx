import { db } from "../../../../lib/db";
import { AllowedIpsTable } from "../../../../components/ip-whitelist/allowed-ips-table";

export const dynamic = "force-dynamic";

export default async function AllowedIpsPage() {
  const allowedIps = (await db.allowedIP.findMany({
    orderBy: { createdAt: "desc" },
  })).map((record) => ({ ...record, createdAt: record.createdAt.toISOString() }));

  return (
    <section>
      <h1>Access Control</h1>
      <div className="admin-card">
        <p style={{ marginTop: 0 }}>
          Hanya IP yang terdaftar yang dapat mengakses panel manajemen.
          IP dapat dikelola dari database maupun melalui form berikut.
        </p>
        <AllowedIpsTable initialIps={allowedIps} />
      </div>
    </section>
  );
}