import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { NativeHeader } from "../NativeHeader";
import { Brand } from "./Brand";
import { PageMotion } from "./PageMotion";

export function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <div className="native-profile">
      <a className="profile-skip-link" href="#main-content">Skip to content</a>
      <NativeHeader />
      <PageMotion>{children}</PageMotion>
      <footer className="profile-footer">
        <div className="profile-footer-top">
          <div><Brand /><p>A little technology.<br />A lot of personality.</p></div>
          <nav aria-label="Footer navigation">
            <Link href="/">Home</Link>
            <Link href="/product">Product</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/connect">Connect</Link>
            <Link href="/playground">Playground</Link>
          </nav>
          <a className="profile-footer-email" href="mailto:contact@aibox.id">Let’s make a moment <ArrowUpRight size={17} aria-hidden="true" /><span>contact@aibox.id</span></a>
        </div>
        <div className="profile-footer-bottom"><span>© AIBox. Made for human moments.</span><span>gesture capture / ai-generated frames</span></div>
      </footer>
    </div>
  );
}
