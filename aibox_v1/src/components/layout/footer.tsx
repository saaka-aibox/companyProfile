import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer section-shell" style={{ borderTop: "1px solid var(--line)", paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" className="logo">
          <span className="logo-mark">✦</span>
          <span>ai<span>box</span></span>
        </Link>
        <small style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
          Next-generation AI photobooth stations &amp; event capture systems.
        </small>
      </div>
      <nav style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <a href="#product">Product</a>
        <a href="#features">Features</a>
        <a href="#moments">Moments</a>
        <a href="#faq">FAQ</a>
        <a href="#pricing">Pricing</a>
        <a href="#contact">Contact</a>
      </nav>
      <small>© {new Date().getFullYear()} AIBOX. All rights reserved.</small>
    </footer>
  );
}
