"use client";

import Link from "next/link";
import { ArrowUpRight, Pause, Play, Quote, RotateCw } from "lucide-react";
import { useId, useRef, useState } from "react";
import { galleryMoments, type GalleryMoment } from "./gallery-moments";
import { PhotoPrint } from "./PhotoPrint";
import { useInfinitePhotoLoop } from "./useInfinitePhotoLoop";

// Each strip exceeds the page width so a wrap never exposes an empty edge.
const stripMoments = [...galleryMoments, ...galleryMoments];

function ReviewCard({ moment, flipped, decorative, onToggle, onHover, onLeave }: {
  moment: GalleryMoment;
  flipped: boolean;
  decorative: boolean;
  onToggle: (button: HTMLButtonElement) => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const reviewId = useId();
  const sample = moment.feedback?.source === "sample";
  return (
    <article className="moment-card" data-tone={moment.frame.tone} data-flipped={flipped} aria-hidden={decorative || undefined}>
      <button
        type="button"
        className="moment-card-button"
        tabIndex={decorative ? -1 : 0}
        aria-pressed={flipped}
        aria-label={flipped ? `Show ${moment.frame.name} photo` : `Show ${sample ? "sample " : ""}review for ${moment.frame.name}`}
        aria-describedby={flipped ? reviewId : undefined}
        onPointerDown={event => { if (decorative) event.preventDefault(); }}
        onClick={event => onToggle(event.currentTarget)}
        onPointerEnter={event => { if (event.pointerType === "mouse") onHover(); }}
        onPointerLeave={event => { if (event.pointerType === "mouse") onLeave(); }}
      >
        <span className="moment-card-turn">
          <span className="moment-card-front" aria-hidden={flipped}><PhotoPrint moment={moment} /><span className="moment-flip-hint"><RotateCw size={13} aria-hidden="true" /> {moment.source === "ai-generated" ? "AI-generated preview" : "AIBox guest photo"}</span></span>
          <span className="moment-card-back" id={reviewId} aria-hidden={!flipped}>
            <span className="profile-micro">{sample ? "sample review / layout preview" : "from our guests"}</span>
            <Quote size={32} strokeWidth={1.2} aria-hidden="true" />
            <span className="moment-review-quote">{moment.feedback ? `“${moment.feedback.quote}”` : "This frame is waiting for its first guest story."}</span>
            <span className="moment-review-author">{moment.feedback?.attribution ?? moment.frame.name}</span>
            <span className="moment-review-footer"><span>aibox</span><span>{sample ? "illustrative example" : moment.frame.code}</span></span>
          </span>
        </span>
      </button>
    </article>
  );
}

export function PhotoResultsCarousel() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [manualPause, setManualPause] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const viewportId = useId();
  const userPaused = manualPause || opened !== null;

  useInfinitePhotoLoop(viewportRef, stripRef, userPaused || keyboardFocus || hovered !== null);

  function toggleReview(key: string, button: HTMLButtonElement) {
    if (opened === key) { setOpened(null); return; }
    setOpened(key);
    // After the loop pauses, bring the whole review into view on narrow screens.
    requestAnimationFrame(() => button.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" }));
  }

  function togglePlayback() {
    if (userPaused) { setManualPause(false); setOpened(null); }
    else setManualPause(true);
  }

  return (
    <div className="moment-loop" role="region" aria-roledescription="carousel" aria-label="Framed photos and guest review previews">
      <div className="moment-loop-bar profile-container">
        <span className="profile-micro">the photo wall / hover or tap to turn</span>
        <button type="button" className="moment-loop-toggle" aria-pressed={userPaused} aria-controls={viewportId} onClick={togglePlayback}>
          {userPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{userPaused ? "Resume photo loop" : "Pause photo loop"}
        </button>
      </div>
      <div
        ref={viewportRef}
        id={viewportId}
        className="moment-loop-viewport"
        onFocusCapture={event => { if (event.target.matches(":focus-visible")) setKeyboardFocus(true); }}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}
      >
        <div className="moment-loop-track">
          {[0, 1, 2].map(copy => (
            <div className="moment-loop-strip" key={copy} ref={copy === 1 ? stripRef : undefined}>
              {stripMoments.map((moment, index) => {
                const key = `${copy}-${index}`;
                return <ReviewCard key={key} moment={moment} decorative={copy !== 1 || index >= galleryMoments.length} flipped={hovered === key || opened === key} onHover={() => setHovered(key)} onLeave={() => setHovered(null)} onToggle={button => toggleReview(key, button)} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="moment-loop-note profile-container"><p>AI-generated portraits and sample reviews for this preview. Real guest stories will appear here.</p><Link className="profile-text-link" href="/gallery">Explore the frame collection <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </div>
  );
}
