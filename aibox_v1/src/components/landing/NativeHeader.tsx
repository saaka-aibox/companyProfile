"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, Camera, Hand, Sparkles, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Brand } from "./profile/Brand";

const pageLinks = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Gallery", href: "/gallery" },
  { label: "Connect", href: "/connect" },
  { label: "Playground", href: "/playground" },
];

const productLinks = [
  { label: "Meet MagicBooth", description: "A closer look at the AI photobooth.", href: "/product", icon: Camera },
  { label: "The experience", description: "From a wave to a photo worth keeping.", href: "/product#experience", icon: Sparkles },
  { label: "Try hand control", description: "Explore the interactive 3D playground.", href: "/playground", icon: Hand },
];

export function NativeHeader() {
  const pathname = usePathname();
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const productButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenus() {
    setProductOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!productOpen && !mobileOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setProductOpen(false);
        setMobileOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (mobileOpen) mobileButtonRef.current?.focus();
        else productButtonRef.current?.focus();
        setProductOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [productOpen, mobileOpen]);

  return (
    <>
      <Link href="/product#experience" className="profile-announcement">
        <span className="profile-live-dot" aria-hidden="true" />
        A new way to make a moment. <span>Meet MagicBooth</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </Link>
      <header className="native-header" ref={headerRef}>
        <div className="profile-nav-inner">
          <Brand />
          <nav className="profile-desktop-nav" aria-label="Main navigation">
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
            <div
              className="profile-nav-disclosure"
              onPointerEnter={(event) => { if (event.pointerType === "mouse") setProductOpen(true); }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setProductOpen(false);
              }}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProductOpen(false); }}
            >
              <button
                ref={productButtonRef}
                type="button"
                aria-expanded={productOpen}
                aria-controls="product-navigation"
                data-active={pathname === "/product"}
                onClick={(event) => {
                  // A mouse click follows hover; keep that disclosure open.
                  if (event.detail === 0) setProductOpen((open) => !open);
                  else setProductOpen(true);
                }}
                onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setProductOpen(true); } }}
              >Product <ChevronDown size={13} aria-hidden="true" /></button>
              <div id="product-navigation" className="profile-nav-dropdown" hidden={!productOpen}>
                <p className="profile-micro">one booth. endless possibilities.</p>
                {productLinks.map(({ label, description, href, icon: Icon }) => (
                  <Link href={href} key={href} onClick={closeMenus}>
                    <span className="profile-nav-icon"><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></span>
                    <span><strong>{label}</strong><small>{description}</small></span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/gallery" aria-current={pathname === "/gallery" ? "page" : undefined}>Gallery</Link>
            <Link href="/connect" aria-current={pathname === "/connect" ? "page" : undefined}>Connect</Link>
          </nav>
          <div className="profile-nav-actions">
            <ThemeToggle />
            <Link className="button profile-button-outline profile-nav-contact" href="/connect">Talk to us</Link>
            <Link className="button button-primary profile-nav-play" href="/playground">Try playground <ArrowUpRight size={15} aria-hidden="true" /></Link>
            <button
              className="profile-menu-toggle"
              ref={mobileButtonRef}
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="profile-mobile-navigation"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              onClick={() => { setMobileOpen((open) => !open); setProductOpen(false); }}
            >{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
        <nav id="profile-mobile-navigation" className="profile-mobile-nav" aria-label="Mobile navigation" hidden={!mobileOpen}>
          {pageLinks.map(({ label, href }, index) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={closeMenus}>
              <span className="profile-micro">0{index + 1}</span>{label}<ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          ))}
          <p>Gesture-led photos. Frames made for you.</p>
        </nav>
      </header>
    </>
  );
}
