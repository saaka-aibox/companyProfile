"use client";

import { ArrowUpRight, Pause, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const FILM_DURATION = 18;
const chapters = [
  { start: 0, title: "A wave says hello.", label: "wave", copy: "Step into view and raise your hand. A simple gesture starts your photo experience." },
  { start: 6, title: "Put your mood in words.", label: "create", copy: "Scan the QR code to choose a frame or describe a new one. AI turns the prompt into your own visual direction." },
  { start: 12, title: "A moment you can keep.", label: "keep", copy: "Strike a pose for the countdown. Your photo becomes a printed keepsake and a digital memory to share." },
];

function formatTime(seconds: number) {
  return `0:${Math.floor(seconds).toString().padStart(2, "0")}`;
}

/** Local video, with chapter navigation driven by the media clock. */
export function ExperienceWalkthrough() {
  const [loaded, setLoaded] = useState(false);
  const [wantsPlayback, setWantsPlayback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstVisitRef = useRef(true);
  const pendingSeekRef = useRef<number | null>(null);
  const videoId = useId();
  const scene = Math.max(0, chapters.findLastIndex(chapter => time >= chapter.start));
  const current = chapters[scene];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        setWantsPlayback(false);
      } else if (firstVisitRef.current && document.visibilityState === "visible") {
        firstVisitRef.current = false;
        // Respect motion and data preferences; explicit Play remains available.
        if (!reducedMotion.matches && !connection?.saveData) {
          setLoaded(true);
          setWantsPlayback(true);
        }
      }
    }, { threshold: .25 });
    function pauseWhenHidden() {
      if (document.visibilityState !== "visible") setWantsPlayback(false);
    }
    function pauseForMotionPreference() {
      if (reducedMotion.matches) setWantsPlayback(false);
    }
    observer.observe(root);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    reducedMotion.addEventListener("change", pauseForMotionPreference);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      reducedMotion.removeEventListener("change", pauseForMotionPreference);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !loaded) return;
    let cancelled = false;
    if (wantsPlayback) {
      video.play().catch(error => {
        if (cancelled || error.name === "AbortError") return;
        setWantsPlayback(false);
        setNotice("Press Play to start the film, or open the video below.");
      });
    } else video.pause();
    return () => { cancelled = true; };
  }, [loaded, wantsPlayback]);

  function seek(seconds: number) {
    const target = Math.min(FILM_DURATION - .05, Math.max(0, seconds));
    const video = videoRef.current;
    pendingSeekRef.current = target;
    setLoaded(true);
    setTime(target);
    setCompleted(false);
    setNotice("");
    if (video && video.readyState >= 1) {
      video.currentTime = target;
      pendingSeekRef.current = null;
    }
  }

  function togglePlayback() {
    firstVisitRef.current = false;
    if (wantsPlayback) { setWantsPlayback(false); return; }
    if (completed) seek(0);
    if (videoRef.current?.error) videoRef.current.load();
    setLoaded(true);
    setNotice("");
    setWantsPlayback(true);
  }

  function selectChapter(index: number) {
    firstVisitRef.current = false;
    // Land after the editorial fade so paused chapters show meaningful artwork.
    seek(chapters[index].start + .5);
  }

  return (
    <div ref={rootRef} className="experience-film">
      <div className="experience-stage">
        <video
          ref={videoRef}
          id={videoId}
          className="experience-video"
          src={loaded ? "/videos/aibox-experience.mp4" : undefined}
          poster="/videos/aibox-experience-poster.jpg"
          width={1280}
          height={1080}
          muted
          playsInline
          preload={loaded ? "auto" : "none"}
          aria-label="AIBox motion advertisement: wave to start, create your frame, and keep your photo."
          onLoadedMetadata={() => {
            if (pendingSeekRef.current !== null && videoRef.current) {
              videoRef.current.currentTime = pendingSeekRef.current;
              pendingSeekRef.current = null;
            }
          }}
          onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setWantsPlayback(false); setCompleted(true); }}
          onError={() => {
            setWantsPlayback(false);
            setNotice("The film couldn’t load. Try Play again or open the video below.");
          }}
        >
          <track kind="captions" src="/videos/aibox-experience.vtt" srcLang="en" label="English" />
          <a href="/videos/aibox-experience.mp4">Watch the AIBox film</a>
        </video>
        <div className="experience-video-bar">
          <button type="button" onClick={togglePlayback} aria-controls={videoId} aria-label={playing ? "Pause film" : completed ? "Replay film" : "Play film"}>
            {playing ? <Pause size={17} /> : completed ? <RotateCcw size={17} /> : <Play size={17} />}
          </button>
          <input type="range" aria-label="Film playback position" aria-controls={videoId} aria-valuetext={`${formatTime(time)} of ${formatTime(FILM_DURATION)}`} min={0} max={FILM_DURATION} step={.1} value={time} onChange={event => seek(Number(event.target.value))} />
          <span>{formatTime(time)} / {formatTime(FILM_DURATION)}</span>
        </div>
      </div>
      <div className="experience-controls">
        <p className="profile-micro">the magicbooth film / 18 seconds</p>
        <h3>Simple moves.<br />Great memories.</h3>
        <div className="experience-chapters" aria-label="Film chapters">
          {chapters.map(({ title, label, start }, index) => (
            <button key={label} type="button" aria-pressed={scene === index} aria-controls={videoId} onClick={() => selectChapter(index)}>
              <span>0{index + 1}</span><span>{label}<small>{title}</small></span>
              <span className="experience-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (time - start) / 6 * 100))}%` }} /></span>
            </button>
          ))}
        </div>
        <p className="experience-description" aria-live="polite">{current.copy}</p>
        <button className="button profile-button-ink" type="button" aria-controls={videoId} onClick={togglePlayback}>
          {playing ? <Pause size={16} /> : completed ? <RotateCcw size={16} /> : <Play size={16} />}
          {playing ? "Pause film" : completed ? "Replay film" : "Play film"}
        </button>
        {notice && <p className="experience-video-notice" role="status">{notice} <a href="/videos/aibox-experience.mp4">Open video</a></p>}
        <Link className="profile-text-link" href="/playground">Try it with your hand <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <p className="experience-film-note">Motion concept · sound-free</p>
      </div>
    </div>
  );
}
