"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Check } from "lucide-react";
import { useId, useState } from "react";
import { photostripMoments } from "./photostrip-moments";
import { PhotostripPrint } from "./PhotostripPrint";
import { PhotoOrnament } from "./PhotoOrnament";

/** Browse the same photostrip artwork shown on the homepage. */
export function FrameExplorer() {
  const [selected, setSelected] = useState(0);
  const previewId = useId();
  const moment = photostripMoments[selected];
  return (
    <div className="frame-explorer">
      <div className="frame-explorer-preview" data-tone={moment.tone} id={previewId}>
        <span className="profile-micro">your moment, our photostrips</span>
        <PhotoOrnament kind="spark" tone="orange" className="frame-explorer-ornament" />
        <div className="frame-explorer-print">
          <PhotostripPrint moment={moment} sizes="(max-width: 435px) 75vw, 320px" />
        </div>
        <span className="profile-micro">the complete design / 2:3 print</span>
      </div>
      <div className="frame-explorer-controls">
        <div aria-live="polite" aria-atomic="true">
          <span className="profile-micro">
            {String(selected + 1).padStart(2, "0")} / {photostripMoments.length} photostrip designs
          </span>
          <h3>{moment.name}</h3>
          <p>
            Choose a photostrip to see the complete artwork. The same collection you saw on our photo wall,
            ready for a closer look.
          </p>
        </div>
        <div className="frame-explorer-options" role="group" aria-label="Choose a photostrip design">
          {photostripMoments.map((item, index) => (
            <button
              type="button"
              key={item.id}
              data-tone={item.tone}
              aria-pressed={selected === index}
              aria-controls={previewId}
              onClick={() => setSelected(index)}
            >
              <span className="frame-explorer-swatch">
                <Image src={item.image.src} alt="" fill sizes="80px" loading="lazy" draggable={false} />
                {selected === index && <Check size={13} aria-hidden="true" />}
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <Link href="/connect" className="profile-text-link">
          Make a frame for your event <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <small className="profile-note">
          AIBox photostrip designs for inspiration. Ask us about a frame for your event.
        </small>
      </div>
    </div>
  );
}
