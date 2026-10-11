"use client";

import Link from "next/link";
import { ArrowUpRight, Pause, Play, Quote, RotateCw } from "lucide-react";
import { useId, useRef, useState } from "react";
import { photostripMoments, type PhotostripMoment } from "./photostrip-moments";
import { PhotostripPrint } from "./PhotostripPrint";
import { useInfinitePhotoLoop } from "./useInfinitePhotoLoop";

function ReviewCard({
  moment,
  flipped,
  decorative,
  onToggle,
  onHover,
  onLeave,
}: {
  moment: PhotostripMoment;
  flipped: boolean;
  decorative: boolean;
  onToggle: (button: HTMLButtonElement) => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const reviewId = useId();
  const sample = moment.feedback?.source === "sample";
  return (
    <article
      className="moment-card"
      data-tone={moment.tone}
      data-flipped={flipped}
      aria-hidden={decorative || undefined}
    >
      <button
        type="button"
        className="moment-card-button"
        tabIndex={decorative ? -1 : 0}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `Show ${moment.name} photostrip`
            : `Show ${sample ? "sample " : ""}review for ${moment.name}`
        }
        aria-describedby={flipped ? reviewId : undefined}
        onPointerDown={(event) => {
          if (decorative) event.preventDefault();
        }}
        onClick={(event) => onToggle(event.currentTarget)}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") onHover();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") onLeave();
        }}
      >
        <span className="moment-card-turn">
          <span className="moment-card-front" aria-hidden={flipped}>
            <PhotostripPrint moment={moment} />
            <span className="moment-flip-hint">
              <span className="moment-photostrip-name">{moment.name}</span>
              <span>
                <RotateCw size={13} aria-hidden="true" /> flip for review
              </span>
            </span>
          </span>
          <span className="moment-card-back" id={reviewId} aria-hidden={!flipped}>
            <span className="profile-micro">
              {sample
                ? "sample review / layout preview"
                : moment.feedback
                  ? "from our guests"
                  : "a guest story to come"}
            </span>
            <Quote size={32} strokeWidth={1.2} aria-hidden="true" />
            <span className="moment-review-quote">
              {moment.feedback
                ? `“${moment.feedback.quote}”`
                : "This frame is waiting for its first guest story."}
            </span>
            <span className="moment-review-author">{moment.feedback?.attribution ?? moment.name}</span>
            <span className="moment-review-footer">
              <span>aibox</span>
              <span>{sample ? "illustrative example" : moment.name}</span>
            </span>
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
    if (opened === key) {
      setOpened(null);
      return;
    }
    setOpened(key);
    // After the loop pauses, bring the whole review into view on narrow screens.
    requestAnimationFrame(() =>
      button.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" }),
    );
  }

  function togglePlayback() {
    if (userPaused) {
      setManualPause(false);
      setOpened(null);
    } else setManualPause(true);
  }

  return (
    <div
      className="moment-loop"
      role="region"
      aria-roledescription="carousel"
      aria-label="AIBox photostrips and guest review previews"
    >
      <div className="moment-loop-bar profile-container">
        <span className="profile-micro">our photostrips / hover or tap to turn</span>
        <button
          type="button"
          className="moment-loop-toggle"
          aria-pressed={userPaused}
          aria-controls={viewportId}
          onClick={togglePlayback}
        >
          {userPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {userPaused ? "Resume photo loop" : "Pause photo loop"}
        </button>
      </div>
      <div
        ref={viewportRef}
        id={viewportId}
        className="moment-loop-viewport"
        onFocusCapture={(event) => {
          if (event.target.matches(":focus-visible")) setKeyboardFocus(true);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false);
        }}
      >
        <div className="moment-loop-track">
          {[0, 1, 2].map((copy) => (
            <div className="moment-loop-strip" key={copy} ref={copy === 1 ? stripRef : undefined}>
              {photostripMoments.map((moment) => {
                const key = `${copy}-${moment.id}`;
                return (
                  <ReviewCard
                    key={key}
                    moment={moment}
                    decorative={copy !== 1}
                    flipped={hovered === key || opened === key}
                    onHover={() => setHovered(key)}
                    onLeave={() => setHovered(null)}
                    onToggle={(button) => toggleReview(key, button)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="moment-loop-note profile-container">
        <p>
          Our photostrip designs, with sample reviews on the reverse. Real guest stories will appear here.
        </p>
        <Link className="profile-text-link" href="/gallery">
          Explore the frame collection <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
