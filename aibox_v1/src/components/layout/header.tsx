import Link from "next/link";
import { getNavigation } from "../../lib/content-api";

export async function Header() {
  const navigation = await getNavigation();
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        <span className="logo-mark">✦</span>
        <span>ai<span>box</span></span>
      </Link>
      <nav className="main-nav">
        {navigation.items.map((item) => (
          <Link href={item.href} key={`${item.label}-${item.href}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <a href="#pricing" className="button button-small button-primary">
          Book now
        </a>
      </div>
    </header>
  );
}
