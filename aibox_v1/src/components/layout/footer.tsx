import Link from "next/link";

const footerLinks = [
  ["Product", "#product"],
  ["Features", "#features"],
  ["Gallery", "#gallery"],
  ["Playground", "#playground"],
  ["FAQ", "#faq"],
  ["Pricing", "#pricing"],
  ["Contact", "#contact"],
] as const;

export function Footer() {
  return (
    <footer className="site-footer section-shell">
      <div className="footer-brand">
        <Link href="/" className="logo" aria-label="AIBOX home">
          <span className="logo-mark" aria-hidden="true" />
          <span>ai<span>box</span></span>
        </Link>
        <small>Next-generation AI photobooth stations and event capture systems.</small>
      </div>

      <nav aria-label="Footer navigation">
        {footerLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      </nav>

      <small>Copyright {new Date().getFullYear()} AIBOX. All rights reserved.</small>
    </footer>
  );
}
