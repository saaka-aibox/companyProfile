"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { galleryMoments } from "./gallery-moments";
import { PhotoPrint } from "./PhotoPrint";

/** Gallery stays an intentional frame browser rather than an automatic photo strip. */
export function FrameExplorer() {
  const [selected, setSelected] = useState(0);
  const moment = galleryMoments[selected];
  const preview = { ...moment, image: { src: "/images/aibox-event-moment.webp", alt: "AI-generated concept of four friends sharing a photobooth moment" } };
  return (
    <div className="frame-explorer">
      <div className="frame-explorer-preview" data-tone={moment.frame.tone}>
        <span className="profile-micro">your moment, reframed</span>
        <div className="frame-explorer-print"><PhotoPrint moment={preview} /></div>
        <span className="profile-micro">illustrative frame preview</span>
      </div>
      <div className="frame-explorer-controls">
        <div aria-live="polite" aria-atomic="true"><span className="profile-micro">{moment.frame.code} / frame collection</span><h3>{moment.frame.name}</h3><p>Same moment. A whole new feeling. Pick a direction to see the frame change.</p></div>
        <div className="frame-explorer-options" role="group" aria-label="Choose a frame style">
          {galleryMoments.map((item, index) => <button type="button" key={item.id} data-tone={item.frame.tone} aria-pressed={selected === index} onClick={() => setSelected(index)}><span className="frame-explorer-swatch"><i />{selected === index && <Check size={13} aria-hidden="true" />}</span><span>{item.frame.name}</span></button>)}
        </div>
        <div className="frame-explorer-prompt"><span className="profile-micro"><Sparkles size={13} aria-hidden="true" /> a starting direction</span><p>{moment.description}</p></div>
        <Link href="/connect" className="profile-text-link">Make a frame for your event <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <small className="profile-note">Design studies for inspiration. This preview doesn’t generate images.</small>
      </div>
    </div>
  );
}
