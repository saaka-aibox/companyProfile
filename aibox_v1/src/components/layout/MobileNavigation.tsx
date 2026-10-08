"use client";

import Link from "next/link";
import { useState } from "react";
import type { Navigation } from "../../types/content";

export function MobileNavigation({ items }: { items: Navigation["items"] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-menu">
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{isOpen ? "Close" : "Menu"}</span>
        <i aria-hidden="true" />
      </button>

      {isOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation">
          {items.map((item) => (
            <Link href={item.href} key={`${item.label}-${item.href}`} onClick={() => setIsOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link className="button button-primary" href="/connect" onClick={() => setIsOpen(false)}>
            Talk to our team
          </Link>
        </nav>
      )}
    </div>
  );
}
