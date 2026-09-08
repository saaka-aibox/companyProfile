import { moments } from "./data";

export function Moments() {
  return (
    <section className="moments section-shell" id="gallery">
      <div className="center-heading"><p className="section-kicker">✦ Gallery</p><h2>Captured <span>Moments</span></h2><p>Every photo tells a story. Explore moments from our MagicBooth experiences.</p></div>
      <div className="moments-grid">
        {moments.map((moment) => <article className={`moment-card ${moment.tone}`} key={moment.title}><div className="photo-placeholder moment-photo" /><div className="moment-meta"><span>{moment.title}</span><i /></div></article>)}
      </div>
    </section>
  );
}
