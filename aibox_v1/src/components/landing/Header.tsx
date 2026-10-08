import { Logo } from "./Logo";

const links = [
  { label: "Home", href: "#top" },
  { label: "Product", href: "#product" },
  { label: "Playground", href: "#playground" },
  { label: "Gallery", href: "#gallery" },
  { label: "Pricing", href: "#pricing" },
];

export function Header() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="main-nav" aria-label="Main navigation">
        {links.map((link) => <a href={link.href} key={link.label}>{link.label}</a>)}
      </nav>
      <div className="header-actions">
        <a className="icon-button" href="#faq" aria-label="Open help">?</a>
        <a className="icon-button" href="#playground" aria-label="Open interactive playground">✳</a>
        <a className="button button-small button-outline" href="#pricing">View packages</a>
        <a className="button button-small button-primary" href="#contact">Request a demo</a>
      </div>
    </header>
  );
}
