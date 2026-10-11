import Image from "next/image";
import Link from "next/link";
import { useId, type CSSProperties } from "react";

export function Brand() {
  const contrastFilterId = useId();
  const logoStyle = {
    "--aibox-logo-light-filter": `url("#${contrastFilterId}")`,
  } as CSSProperties;

  return (
    <Link className="profile-brand" href="/" aria-label="AIBox home" style={logoStyle}>
      <svg className="profile-brand-filter" aria-hidden="true" focusable="false">
        <defs>
          <filter id={contrastFilterId} colorInterpolationFilters="sRGB">
            {/* R + G + B - 2 isolates white lettering from the saturated brand colors. */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 1 1 0 -2"
              result="whiteLettering"
            />
            <feFlood floodColor="var(--aibox-brand-surface)" result="navyInk" />
            <feComposite in="navyInk" in2="whiteLettering" operator="in" result="contrastLettering" />
            <feComposite in="contrastLettering" in2="SourceGraphic" operator="atop" />
          </filter>
        </defs>
      </svg>
      <Image src="/logo.png" alt="AIBox" width={150} height={40} sizes="138px" />
    </Link>
  );
}
