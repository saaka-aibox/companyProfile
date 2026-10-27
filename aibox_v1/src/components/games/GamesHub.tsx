import Link from "next/link";
import { ArrowUpRight, Camera, Clock3, Hand, Lock, Sparkles, Users, Wifi } from "lucide-react";
import { GAME_LIST } from "../../lib/games/catalog";
import { GamePreview } from "./GamePreview";
import styles from "./games.module.css";

export function GamesHub() {
  return (
    <>
      <section className={`profile-container ${styles.intro}`}>
        <div className={styles.introTop}>
          <p className="profile-eyebrow" style={{ margin: 0 }}><span />ai box games</p>
          <span>4 games / hand tracking</span>
        </div>
        <h1 className={styles.title}>
          Play with your hands.<br /><span>Leave with a photo.</span>
        </h1>
        <p className={styles.lead}>
          Four quick games you control with hand gestures through your camera. Play on one device with a friend beside you,
          or invite people from other places. Every game ends with a photo moment in an AI Box frame.
        </p>
        <div className={styles.leadRow}>
          <Link className="button button-primary" href="/games/suit-arena">Start with Suit Arena <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link className="profile-text-link" href="/room">Try AI Box Room <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="profile-container" aria-label="Games">
        <div className={styles.grid}>
          {GAME_LIST.map((game, i) => (
            <article key={game.id} className={styles.card}>
              <div className={styles.preview}><GamePreview id={game.id} /></div>
              <div className={styles.cardBody}>
                <span className={styles.cardIdx}>0{i + 1} / {game.id}</span>
                <h2 className={styles.cardTitle} style={{ fontSize: "1.7rem", letterSpacing: "-.045em" }}>{game.name}</h2>
                <p className={styles.cardSub}>{game.subtitle}. {game.blurb}</p>
                <ul className={styles.metaList}>
                  <li><Users size={15} aria-hidden="true" /> {game.players}</li>
                  <li><Clock3 size={15} aria-hidden="true" /> {game.duration}</li>
                  <li><Sparkles size={15} aria-hidden="true" /> {game.photo}</li>
                </ul>
                <div className={styles.chips}>
                  {game.modes.map((m) => <span key={m} className={styles.chip}>{m}</span>)}
                </div>
                <div className={styles.cardFoot}>
                  <Link className="button button-primary" href={`/games/${game.id}`} aria-label={`Play ${game.name}`}>
                    Play {game.name} <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.notes}>
          <div className={styles.note}>
            <Camera size={22} aria-hidden="true" />
            <h3>What the camera is for</h3>
            <p>
              Games read your hand from the camera. Use a well lit spot, keep your hand in view and about an arm&apos;s length away.
              Two players share one camera by standing left and right.
            </p>
          </div>
          <div className={styles.note}>
            <Lock size={22} aria-hidden="true" />
            <h3>Your video stays with you</h3>
            <p>
              Hand tracking runs in your browser and your video is never uploaded. In online rooms only hand points (21 small dots) are
              shared, never your video. The photo moment is built on your device and is yours to save.
            </p>
          </div>
          <div className={styles.note}>
            <Wifi size={22} aria-hidden="true" />
            <h3>Play with friends</h3>
            <p>
              Create a room, share the link or the 6 character code, and play on 2 to 4 devices. Open palm is paper, a fist is rock,
              and a peace sign is scissors. <Hand size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} />
            </p>
          </div>
        </div>
      </section>
      <div style={{ height: 80 }} aria-hidden="true" />
    </>
  );
}
