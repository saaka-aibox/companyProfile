import { Download, QrCode, Users, Wallet } from "lucide-react";
import { Eyebrow } from "../../landing/profile/ProfileSections";
import { CreateWizard } from "./CreateWizard";
import { JoinByCode } from "./JoinByCode";
import styles from "./create.module.css";

const STEPS = [
  { icon: Wallet, title: "Pay once", copy: "Choose a package and a frame, then pay with QRIS. Your room opens instantly." },
  { icon: QrCode, title: "Invite", copy: "Share a code, link or QR. Friends join from their own phone or laptop." },
  { icon: Users, title: "Pose together", copy: "Everyone sees each other. Shots fire at the same moment, 4 rounds." },
  { icon: Download, title: "Download + AI", copy: "Get one photostrip with everyone in it, then restyle it with AI if you like." },
] as const;

export function RoomLanding() {
  return (
    <>
      <section className={`profile-container ${styles.hero}`} aria-labelledby="room-title">
        <div className="profile-page-index">
          <Eyebrow>ai box room</Eyebrow>
          <span>online photobox</span>
        </div>
        <div className={styles.heroGrid}>
          <div>
            <h1 id="room-title" className={styles.heroTitle}>
              Together on one strip,
              <br />
              <span>wherever you are.</span>
            </h1>
            <p className={styles.heroCopy}>
              An online photobox for up to 4 devices. Pay once, invite your people, pose at the same moment and walk
              away with a single AI Box photostrip.
            </p>
            <div className={styles.heroActions}>
              <a className="button button-primary" href="#create">Create a room</a>
              <a className="button profile-button-outline" href="#join">I have a code</a>
            </div>
          </div>
          <div className={styles.heroJoin} id="join">
            <span className="profile-micro">already invited?</span>
            <JoinByCode />
          </div>
        </div>
      </section>

      <section className={`profile-section profile-container ${styles.how}`} aria-labelledby="how-title" data-reveal>
        <Eyebrow>how it works</Eyebrow>
        <h2 id="how-title" className={styles.howTitle}>Four steps. About five minutes.</h2>
        <ol className={styles.howList}>
          {STEPS.map(({ icon: Icon, title, copy }, i) => (
            <li key={title} className={styles.howItem}>
              <span className={styles.howIcon}><Icon size={18} aria-hidden="true" /></span>
              <span className="profile-micro">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`profile-section profile-container ${styles.createSection}`} aria-label="Create a room" data-reveal>
        <CreateWizard />
      </section>
    </>
  );
}
