import { db } from "../../../lib/db";
import { NavigationEditor } from "./navigation-editor";

export default async function NavigationPage() {
  const navigation = await db.navigation.findFirst({ orderBy: { updatedAt: "desc" } });
  const items = Array.isArray(navigation?.items)
    ? navigation.items as { label: string; href: string }[]
    : [{ label: "Home", href: "/" }, { label: "Contact", href: "/#contact" }];

  return (
    <section>
      <h1>Navigation</h1>
      <div className="admin-card">
        <p>Atur nama dan alamat setiap menu yang tampil di navbar website publik.</p>
        <NavigationEditor initialItems={items} />
      </div>
    </section>
  );
}
