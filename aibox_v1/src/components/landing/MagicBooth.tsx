import { boothFeatures } from "./data";

export function MagicBooth() {
  return (
    <section className="magicbooth section-shell">
      <div className="product-intro">
        <div>
          <p className="section-kicker">✦ AIBOX PRESENTS</p>
          <h2>Magic<span>Booth</span></h2>
          <p>The world&apos;s first AI-powered photobooth machine.</p>
          <div className="orange-line" />
          <p className="muted-copy">MagicBooth is our flagship product — a standalone experience that uses AI, gesture control, and seamless software to create a truly modern photo moment.</p>
          <div className="tag-row"><span>AI Camera</span><span>AI-powered Detect</span><span>Instant Print &amp; Digital</span></div>
        </div>
        <div className="photo-placeholder machine-placeholder"><span>Magic<br />Booth</span></div>
      </div>
      <div className="booth-heading">
        <p className="section-kicker">✦ The future of photo experience</p>
        <h3>Meet <span>MagicBooth</span></h3>
        <p>The world&apos;s first AI-powered photobooth with real-time hand gesture detection and instant digital delivery.</p>
      </div>
      <div className="feature-grid">
        {boothFeatures.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <div className="feature-image photo-placeholder" aria-hidden="true" />
            <div className="feature-icon">{feature.icon}</div>
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
      <div className="steps-card">
        {["Approach", "Gesture", "Capture", "Receive"].map((step, index) => (
          <div className="step" key={step}><span>{index + 1}</span><strong>{step}</strong><small>{["Find your moment", "Make a move", "Strike a pose", "Share the magic"][index]}</small></div>
        ))}
      </div>
    </section>
  );
}
