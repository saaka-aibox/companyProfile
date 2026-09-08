export function Hero() {
  return (
    <section className="hero section-shell" id="top">
      <div className="hero-orb hero-orb-left" />
      <div className="hero-orb hero-orb-right" />
      <div className="hero-content">
        <p className="section-kicker">✦ AI-Powered Photo Experience</p>
        <h1>Capture Your Essence,<br /><em>Elevated by aibox.</em></h1>
        <p className="hero-copy">The world&apos;s first AI-powered photobooth with gesture control — built for effortless, unforgettable moments.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#pricing">Book now</a>
          <a className="button button-outline" href="#product">Our product <span>↗</span></a>
        </div>
        <div className="hero-stats">
          <span><strong>500+</strong> events</span>
          <span><strong>10K+</strong> captures</span>
          <span><strong>99%</strong> happy clients</span>
        </div>
      </div>
      <div className="hero-booth hero-booth-left" aria-hidden="true">AI<br /><b>BOX</b></div>
      <div className="hero-booth hero-booth-right" aria-hidden="true">AI<br /><b>BOX</b></div>
    </section>
  );
}
