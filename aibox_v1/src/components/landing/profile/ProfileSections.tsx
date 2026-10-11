import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { PhotoOrnament, type PhotoOrnamentKind } from "./PhotoOrnament";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="profile-eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  label,
  title,
  children,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="profile-section-heading">
      <div>
        <Eyebrow>{label}</Eyebrow>
        <h2>{title}</h2>
      </div>
      {children && <div className="profile-heading-aside">{children}</div>}
    </div>
  );
}

export function PageIntro({
  index,
  label,
  title,
  children,
  ornament = "print",
}: {
  index: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
  ornament?: PhotoOrnamentKind;
}) {
  return (
    <section className="profile-page-intro profile-container">
      <div className="profile-page-index">
        <Eyebrow>{label}</Eyebrow>
        <span>{index} / 05</span>
      </div>
      <div className="profile-page-lead">
        <div>
          <h1>{title}</h1>
          <div className="profile-intro-copy">{children}</div>
        </div>
        <PhotoOrnament kind={ornament} className="profile-intro-ornament" />
      </div>
    </section>
  );
}

export function ContactBanner() {
  return (
    <section className="profile-cta" data-reveal aria-labelledby="contact-banner-title">
      <div className="profile-container profile-cta-inner">
        <div className="profile-cta-title">
          <Eyebrow>Something worth remembering</Eyebrow>
          <h2 id="contact-banner-title">
            Your next event.
            <br />A little more <em>you.</em>
          </h2>
          <PhotoOrnament kind="spark" tone="orange" className="profile-cta-ornament" />
        </div>
        <div>
          <p>
            Bring AIBox to your celebration, venue, or brand. Let’s shape a photo experience around your
            people.
          </p>
          <Link className="button profile-button-ink" href="/connect">
            Let’s make it happen <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
