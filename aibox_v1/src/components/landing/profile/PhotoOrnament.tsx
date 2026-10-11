export type PhotoOrnamentKind = "spark" | "orbit" | "print";

type PhotoOrnamentProps = {
  kind?: PhotoOrnamentKind;
  tone?: "blue" | "orange";
  className?: string;
};

/** Decorative print, flash, and lens motifs; no images, scripts, or focus targets. */
export function PhotoOrnament({ kind = "spark", tone = "blue", className = "" }: PhotoOrnamentProps) {
  return (
    <svg
      className={`profile-ornament ${className}`.trim()}
      data-accent={tone}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "spark" && (
        <>
          <path
            className="profile-ornament-shadow"
            transform="translate(4 4)"
            d="M60 7 71 36 98 23 85 50 113 61 85 72 98 99 71 86 60 114 49 86 22 99 35 72 7 61 35 50 22 23 49 36Z"
          />
          <path
            className="profile-ornament-color"
            d="M60 7 71 36 98 23 85 50 113 61 85 72 98 99 71 86 60 114 49 86 22 99 35 72 7 61 35 50 22 23 49 36Z"
          />
          <path d="m49 53 20 20m0-20L49 73" />
        </>
      )}
      {kind === "orbit" && (
        <>
          <ellipse cx="60" cy="60" rx="53" ry="22" transform="rotate(-32 60 60)" />
          <ellipse cx="60" cy="60" rx="53" ry="22" transform="rotate(32 60 60)" />
          <circle className="profile-ornament-shadow" cx="64" cy="64" r="29" />
          <circle className="profile-ornament-paper" cx="60" cy="60" r="29" />
          <circle className="profile-ornament-color" cx="60" cy="60" r="18" />
          <path d="m60 42 11 9v16l-11 11-13-9V53Z" />
          <circle className="profile-ornament-color" cx="99" cy="27" r="8" />
          <path d="M15 82v14m-7-7h14M85 105h14" />
        </>
      )}
      {kind === "print" && (
        <>
          <g transform="rotate(-10 60 60)">
            <rect className="profile-ornament-shadow" x="31" y="14" width="66" height="101" rx="4" />
            <rect className="profile-ornament-paper" x="26" y="9" width="66" height="101" rx="4" />
            <rect className="profile-ornament-color" x="35" y="19" width="48" height="32" rx="2" />
            <rect className="profile-ornament-color" x="35" y="58" width="48" height="32" rx="2" />
            <circle className="profile-ornament-paper" cx="51" cy="32" r="4" />
            <path d="m37 47 14-10 12 7 10-12 9 14M37 85l15-16 12 10 11-5 7 12M37 100h22m7 0h15" />
          </g>
          <path d="M104 56v14m-7-7h14M8 22l8 8m0-8-8 8" />
        </>
      )}
    </svg>
  );
}
