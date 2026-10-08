"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content is visible by default; motion progressively enhances sections below the fold. */
export function PageMotion({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = mainRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!sections || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    function updatePreference() {
      observer.disconnect();
      sections?.forEach((section) => {
        section.classList.remove("reveal-pending");
        if (!preference.matches && section.getBoundingClientRect().top > window.innerHeight) {
          section.classList.add("reveal-pending");
          observer.observe(section);
        }
      });
    }

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updatePreference);
      sections.forEach((section) => section.classList.remove("reveal-pending"));
    };
  }, []);

  return <main id="main-content" ref={mainRef} tabIndex={-1}>{children}</main>;
}
