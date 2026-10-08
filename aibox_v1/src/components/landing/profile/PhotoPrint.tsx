import Image from "next/image";
import type { GalleryMoment } from "./gallery-moments";

export function PhotoPrint({ moment }: { moment: GalleryMoment }) {
  return (
    <span className="photo-print" data-tone={moment.frame.tone}>
      <span className="photo-print-image"><Image src={moment.image.src} alt={moment.image.alt} fill sizes="(max-width: 760px) 75vw, 320px" draggable={false} /></span>
      <span className="photo-print-caption">{moment.frame.caption}</span>
      <span className="photo-print-footer"><span>aibox</span><span>{moment.frame.code}</span></span>
      <svg className="photo-frame-ornament" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        {moment.frame.ornament === "sun" && <><circle cx="50" cy="50" r="22" /><circle cx="50" cy="50" r="32" /><path d="M50 5v9m0 72v9M5 50h9m72 0h9M18 18l7 7m50 50 7 7M18 82l7-7m50-50 7-7" /></>}
        {moment.frame.ornament === "orbit" && <><ellipse cx="50" cy="50" rx="42" ry="20" transform="rotate(-35 50 50)" /><ellipse cx="50" cy="50" rx="42" ry="20" transform="rotate(35 50 50)" /><circle cx="50" cy="50" r="8" /><circle cx="79" cy="23" r="4" fill="currentColor" stroke="none" /></>}
        {moment.frame.ornament === "petals" && <><path d="M50 50C16 19 36-5 50 50c14-55 34-31 0 0 55-14 31 34 0 0 31 34-5 54 0 0-55 14-31-34 0 0" /><circle cx="50" cy="50" r="9" /></>}
      </svg>
    </span>
  );
}
