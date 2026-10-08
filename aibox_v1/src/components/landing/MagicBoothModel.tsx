import type { CSSProperties } from "react";

type BoothStyle = CSSProperties & {
  "--booth-accent"?: string;
  "--booth-glow"?: string;
  "--booth-tilt-x"?: string;
  "--booth-tilt-y"?: string;
};

export function MagicBoothModel({ className = "", style }: { className?: string; style?: BoothStyle }) {
  return (
    <div className={`booth-model ${className}`} style={style} role="img" aria-label="Three-dimensional AIBOX photobooth concept">
      <div className="booth-side" />
      <div className="booth-top" />
      <div className="booth-front">
        <div className="booth-brand"><span className="booth-brand-mark" aria-hidden="true" /> AIBOX</div>
        <div className="booth-ring" aria-hidden="true"><i /><span /></div>
        <div className="booth-lens" aria-hidden="true"><i /></div>
        <div className="booth-screen">
          <span className="booth-screen-label">MAGICBOOTH / 01</span>
          <span className="booth-screen-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <strong>MAKE<br />A MOMENT</strong>
          <span className="booth-screen-footer"><i /> READY WHEN YOU ARE</span>
        </div>
        <div className="booth-print-slot"><i /></div>
        <div className="booth-status"><i /> AI CAMERA · LIVE</div>
      </div>
      <div className="booth-neck" />
      <div className="booth-base"><span>AI BOX</span></div>
      <div className="booth-floor-shadow" />
    </div>
  );
}
