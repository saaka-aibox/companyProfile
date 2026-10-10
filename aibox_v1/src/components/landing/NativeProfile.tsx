import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Hand, Play, Printer, Sparkles, Check, Mail, MessageCircle, Move3d, Camera } from "lucide-react";
import { GesturePlayground } from "./GesturePlayground";
import { ProfileShell } from "./profile/ProfileShell";
import { ContactBanner, Eyebrow, PageIntro, SectionHeading } from "./profile/ProfileSections";
import { ExperienceWalkthrough } from "./profile/ExperienceWalkthrough";
import { PhotoResultsCarousel } from "./profile/PhotoResultsCarousel";
import { FrameExplorer } from "./profile/FrameExplorer";
import { EventEnquiry } from "./profile/EventEnquiry";

export { nativePageMetadata } from "./profile/metadata";

const features = [
  { label: "gesture capture", title: "It starts with a wave.", description: "An intuitive hand gesture starts the experience. Less time figuring it out. More time being in the photo.", icon: Hand },
  { label: "ai-generated frames", title: "Your words. Your world.", description: "Describe the mood, the celebration, or the brand. Create a photo frame from your prompt, or choose a prepared style.", icon: Sparkles },
  { label: "print + digital", title: "Take the feeling home.", description: "A physical keepsake for the fridge. A digital photo for the group chat. One moment, ready to travel.", icon: Printer },
];

const faqs = [
  { question: "What makes MagicBooth different?", answer: "MagicBooth brings hand-gesture capture and AI-generated photo frames together in one photobooth experience. Guests can make a frame their own and leave with a printed or digital photo." },
  { question: "Can we make it feel like our event?", answer: "Yes. Frame concepts and the visual direction can be planned around your celebration, venue, or brand. Share your brief so we can discuss a setup that fits." },
  { question: "Which events is it designed for?", answer: "Weddings, corporate events, brand activations, exhibitions, and ongoing venue experiences. Tell us about the space, guests, and flow you have in mind." },
  { question: "How do we check availability and pricing?", answer: "Send your event date, location, and a short brief through our Connect page. The team can confirm availability, delivery options, and a tailored quote." },
];

const whatsappBookingMessage = [
  "Halo tim AIBox! Saya ingin booking photobooth MagicBooth untuk acara saya.",
  "",
  "Jenis acara: ",
  "Tanggal acara: ",
  "Lokasi: ",
  "Perkiraan jumlah tamu: ",
  "",
  "Mohon informasi ketersediaan dan paket sewa. Terima kasih!",
].join("\n");
const whatsappBookingUrl = `https://wa.me/6285759040420?text=${encodeURIComponent(whatsappBookingMessage)}`;

function Hero() {
  return (
    <section className="profile-hero" aria-labelledby="hero-title">
      <Image src="/bg.png" alt="Two AIBox photobooths outside a warmly lit venue" fill preload sizes="100vw" className="profile-hero-image" />
      <div className="profile-hero-shade" />
      <div className="profile-hero-content">
        <p className="profile-hero-eyebrow"><span /> the next photo moment starts here</p>
        <h1 id="hero-title">Just a wave.<br /><em>A little magic.</em></h1>
        <p className="profile-hero-copy">Be yourself. We’ll frame the feeling.<br />Gesture-led photos and AI-made frames, brought to life by AIBox.</p>
        <div className="profile-hero-actions">
          <Link href="/product" className="button button-primary">Discover MagicBooth <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <a href="#experience" className="button profile-button-glass"><Play size={15} aria-hidden="true" /> See the experience</a>
        </div>
      </div>
      <div className="profile-hero-bottom"><span>designed for real-life moments</span><a href="#experience">a closer look <ArrowDown size={14} aria-hidden="true" /></a></div>
    </section>
  );
}

function AudienceBar() {
  return (
    <section className="profile-audiences profile-container" aria-label="Made for your occasion">
      <p className="profile-micro">at home in good company</p>
      <div><span>Weddings</span><span>Brand activations</span><span>Corporate events</span><span>Venues & attractions</span></div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section className="profile-section profile-container" id="experience" data-reveal aria-label="How MagicBooth works">
      <SectionHeading label="01 / the experience" title={<>Less posing.<br /><span>More personality.</span></>}>
        <p>A little technology makes room for a very human moment. Here’s how it comes together.</p>
      </SectionHeading>
      <ExperienceWalkthrough />
    </section>
  );
}

function Features() {
  return (
    <section className="profile-features profile-section" id="features" data-reveal>
      <div className="profile-container">
        <SectionHeading label="the details that make the difference" title={<>Thoughtful tech.<br /><span>Effortless moments.</span></>}><p>Every interaction has a purpose: helping your guests make a photo that feels like them.</p></SectionHeading>
        <div className="profile-feature-grid">
          {features.map(({ title, description, label, icon: Icon }, index) => (
            <article className="profile-feature-card" key={label}>
              <div className="profile-feature-top"><span>0{index + 1}</span><Icon size={29} strokeWidth={1.4} aria-hidden="true" /></div>
              <p className="profile-micro">{label}</p><h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FrameSection() {
  return (
    <section className="profile-gallery-explorer profile-container" id="frames" aria-label="Framed photo gallery">
      <SectionHeading label="made to feel like you" title={<>One moment.<br /><span>A thousand moods.</span></>}><p>From softly romantic to confidently minimal. Find a starting point, then make it your own.</p></SectionHeading>
      <FrameExplorer />
    </section>
  );
}

function PlaygroundTeaser() {
  return (
    <section className="profile-play-teaser profile-container" data-reveal>
      <div className="profile-play-symbol" aria-hidden="true"><Hand size={70} strokeWidth={1} /><span>hello, human.</span></div>
      <div><Eyebrow>Meet the playful side of AIBox</Eyebrow><h2>Go on.<br /><span>Make a move.</span></h2><p>Explore the booth in 3D. Try a hand gesture. Get a feel for the experience before your event.</p><Link href="/playground" className="profile-text-link">Enter the playground <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="profile-faq profile-section profile-container" data-reveal>
      <div><Eyebrow>A few things to know</Eyebrow><h2>Good questions.<br /><span>Simple answers.</span></h2><Link href="/connect" className="profile-text-link">Ask us something <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <div className="profile-faq-list">{faqs.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </section>
  );
}

export function NativeHomePage() {
  return (
    <ProfileShell>
      <Hero />
      <section className="profile-home-moments" aria-label="The AIBox photo wall"><PhotoResultsCarousel /></section>
      <AudienceBar />
      <ExperienceSection />
      <Features />
      <PlaygroundTeaser />
      <ContactBanner />
    </ProfileShell>
  );
}

export function NativeProductPage() {
  return (
    <ProfileShell>
      <PageIntro index="02" label="meet magicbooth" title={<>A familiar photo.<br /><span>A whole new feeling.</span></>}>
        <p>Hand gestures. AI-generated frames. Real keepsakes. A photobooth designed to bring a little more personality to every gathering.</p>
        <Link className="profile-text-link" href="/connect">Bring it to your event <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </PageIntro>
      <section className="profile-product-showcase profile-container" aria-label="MagicBooth product concept">
        <div className="profile-product-photo"><Image src="/bg.png" alt="AIBox photobooths at a venue entrance" fill preload sizes="(max-width: 760px) 100vw, 70vw" /><span className="profile-photo-label">magicbooth / product concept</span></div>
        <div className="profile-product-summary"><span className="profile-micro">the booth is just the beginning</span><h2>Made to bring<br />people together.</h2><p>A distinctive presence in the room. A simple invitation to step in. An experience guests can make their own.</p><ul>{["Gesture-led capture", "Prompt-created photo frames", "Printed + digital keepsakes"].map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul><Link href="/playground" className="button profile-button-ink">Explore in 3D <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </section>
      <Features />
      <ExperienceSection />
      <FAQ />
      <ContactBanner />
    </ProfileShell>
  );
}

export function NativeGalleryPage() {
  return (
    <ProfileShell>
      <PageIntro index="03" label="the photo collection" title={<>Good moments.<br /><span>Your kind of frame.</span></>}><p>A little color. A lot of personality. Explore framed portrait previews for your next AIBox moment.</p></PageIntro>
      <FrameSection />
      <section className="profile-section profile-container" data-reveal>
        <SectionHeading label="around the photo" title={<>The best part?<br /><span>The people in it.</span></>}><p>Leave a little room for the spontaneous. That’s usually where the good photos happen.</p></SectionHeading>
        <figure className="profile-event-photo"><Image src="/images/aibox-event-moment.webp" alt="Concept of four guests sharing a spontaneous photobooth moment" width={1536} height={1024} sizes="(max-width: 1280px) 95vw, 1200px" /><figcaption><span>good company. great keepsakes.</span><small>AIBox experience concept</small></figcaption></figure>
      </section>
      <ContactBanner />
    </ProfileShell>
  );
}

export function NativeConnectPage() {
  return (
    <ProfileShell>
      <PageIntro index="04" label="let’s connect" title={<>A great event starts<br /><span>with a conversation.</span></>}><p>A wedding, a launch, a corner of your venue. Tell us what you’re imagining.</p></PageIntro>
      <section className="profile-connect-grid profile-container" aria-label="Plan your AIBox experience">
        <div className="profile-connect-aside">
          <Eyebrow>Make it your moment</Eyebrow><h2>Big celebration.<br />Small gathering.<br /><span>All welcome.</span></h2>
          <p>Share a few details about your date, location, and guests. We’ll help you explore a setup that fits.</p>
          <a className="profile-contact-whatsapp" href={whatsappBookingUrl} target="_blank" rel="noopener noreferrer" aria-label="Book AIBox via WhatsApp (opens in a new tab)">
            <span className="profile-contact-whatsapp-icon"><MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" /></span>
            <span><small>Prefer to chat?</small><strong>Book via WhatsApp</strong></span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <a className="profile-contact-email" href="mailto:contact@aibox.id"><Mail size={19} aria-hidden="true" /><span>Prefer a simple email?<strong>contact@aibox.id</strong></span><ArrowUpRight size={17} aria-hidden="true" /></a>
          <div className="profile-connect-photo"><Image src="/bg.png" alt="AIBox at an event venue" width={1672} height={941} sizes="(max-width: 760px) 90vw, 440px" /></div>
        </div>
        <EventEnquiry />
      </section>
      <FAQ />
    </ProfileShell>
  );
}

export function NativePlaygroundPage() {
  return (
    <ProfileShell>
      <PageIntro index="05" label="the playground" title={<>Curiosity looks<br /><span>good on you.</span></>}><p>A little world around your next moment. Explore AIBox in animated, isometric venues. Drag to rotate, or pinch with your hand to take control.</p></PageIntro>
      <GesturePlayground showHeading={false} />
      <section className="profile-play-guide profile-container" data-reveal aria-label="Playground controls">
        {[
          { icon: Move3d, title: "Take it for a spin", text: "Drag the booth or focus the viewer and use your arrow keys to look around." },
          { icon: Camera, title: "Let your hands do it", text: "Choose Enable camera, then Allow in your browser's permission prompt. Your video stays in your browser." },
          { icon: Hand, title: "Pinch. Move. Let go.", text: "Touch thumb and index finger together, then move your hand to rotate. Release to keep the angle. Regrip for another turn." },
        ].map(({ icon: Icon, title, text }, index) => <article key={title}><span className="profile-micro">0{index + 1}<Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}
      </section>
      <ContactBanner />
    </ProfileShell>
  );
}
