import { Logo } from "./Logo";

const links = ["Home", "Product", "Gallery", "Contact", "Payment"];

export function Header() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="main-nav" aria-label="Main navigation">
        {links.map((link) => <a href={`#${link.toLowerCase()}`} key={link}>{link}</a>)}
      </nav>
      <div className="header-actions">
        <a className="icon-button" href="#faq" aria-label="Open help">?</a>
        <a className="icon-button" href="#contact" aria-label="Open settings">⌘</a>
        <a className="button button-small button-outline" href="#pricing">Book now</a>
        <a className="button button-small button-primary" href="#contact">Try Magicbooth</a>
      </div>
    </header>
  );
}
