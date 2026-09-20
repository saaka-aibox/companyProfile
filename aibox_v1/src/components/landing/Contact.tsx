import { GestureControl } from "../GestureControl";

export function Contact() {
  return <section className="contact section-shell" id="contact"><div className="center-heading"><p className="section-kicker">✦ Get in touch</p><h2>Ready to Experience <span>MagicBooth?</span></h2><p>Book a demo or ask us anything — our team is ready to help.</p></div><div className="contact-layout"><div className="contact-details"><p>hello@aibox.id</p><p>+62 812 3456 7890</p><p>Jakarta, Indonesia</p><GestureControl /></div><form className="contact-form"><label>Name<input placeholder="Your name" /></label><label>Email<input type="email" placeholder="Your email" /></label><label>Subject<input placeholder="How can we help?" /></label><label>Message<textarea placeholder="Tell us about your event..." rows={4} /></label><button className="button button-primary" type="button">Primary Button ↗</button></form></div></section>;
}
