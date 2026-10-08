import Link from "next/link";
import { getNavigation } from "../../lib/content-api";
import { MobileNavigation } from "./MobileNavigation";

export async function Header() {
  const navigation = await getNavigation();

  return (
    <header className="site-header">
      <Link href="/" className="logo" aria-label="AIBOX home">
        <span className="logo-mark" aria-hidden="true" />
        <span>ai<span>box</span></span>
      </Link>

      <nav className="main-nav" aria-label="Main navigation">
        {navigation.items.map((item) => (
          <Link href={item.href} key={`${item.label}-${item.href}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <a href="#contact" className="button button-small button-primary">Request a demo</a>
      </div>

      <MobileNavigation items={navigation.items} />
    </header>
  );
}
