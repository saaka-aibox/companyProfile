import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const aiboxHomeBlocks = [
    {
      type: "hero",
      eyebrow: "✦ AI-Powered Photo Experience",
      title: "Capture Your Essence, Elevated by aibox.",
      body: "The world's first AI-powered photobooth with gesture control — built for effortless, unforgettable moments.",
      cta: { label: "Book now", href: "#pricing", style: { variant: "primary", size: "medium" } },
      secondaryCta: { label: "Our product ↗", href: "#product", style: { variant: "outline", size: "medium" } },
      stats: [
        { value: "500+", label: "events" },
        { value: "10K+", label: "captures" },
        { value: "99%", label: "happy clients" },
      ],
      layout: "centered",
    },
    {
      type: "story",
      eyebrow: "✦ Redefining Events",
      title: "We Redefine the Photobooth Experience",
      body: "Step into the future of event photography. AIBOX merges cutting-edge artificial intelligence with sleek hardware design to create photobooth moments that are spontaneous, personal, and endlessly shareable.",
      cta: { label: "Our Story", href: "#about", style: { variant: "outline", size: "medium" } },
      secondaryCta: { label: "Watch Demo", href: "#demo", style: { variant: "dark", size: "medium" } },
      imagePosition: "right",
      layout: "split",
    },
    {
      type: "story",
      eyebrow: "✦ Next-Gen Hardware",
      title: "MagicBooth",
      subtitle: "Touch-free capture, instant magic.",
      body: "Engineered from the ground up for seamless events. Intuitive gesture controls let guests interact naturally, while AI image enhancements deliver studio-quality prints and instant digital delivery.",
      tags: ["AI Gesture", "Instant Print", "Custom Frame Themes", "Cloud Gallery"],
      cta: { label: "Explore Specs", href: "#specs", style: { variant: "primary", size: "medium" } },
      imagePosition: "right",
      layout: "split",
    },
    {
      type: "featureGrid",
      eyebrow: "✦ Interactive Technology",
      title: "Meet MagicBooth",
      subtitle: "Three pillars of a memorable photobooth experience",
      columns: 3,
      features: [
        {
          icon: "✦",
          title: "AI Hand Selection Detection",
          description: "The booth recognises gestures naturally and keeps every interaction effortless.",
        },
        {
          icon: "✹",
          title: "Smart Frame Themes",
          description: "Give every capture a polished visual identity with custom themes and overlays.",
        },
        {
          icon: "↗",
          title: "Instant Digital Delivery",
          description: "Guests receive their finished memories quickly, ready to share anywhere.",
        },
      ],
      steps: [
        { step: "1", title: "Approach", subtitle: "Step into frame", icon: "✦" },
        { step: "2", title: "Wave", subtitle: "Pick your theme", icon: "✹" },
        { step: "3", title: "Pose", subtitle: "AI countdown", icon: "★" },
        { step: "4", title: "Collect", subtitle: "Instant print & QR", icon: "↗" },
      ],
    },
    {
      type: "gallery",
      eyebrow: "✦ Real Events",
      title: "Captured Moments",
      subtitle: "Every celebration tells a unique story through our smart lenses",
      columns: 3,
      layout: "grid",
      items: [
        { title: "Retro Fits", tone: "gold", tag: "Vintage Aesthetic", description: "Warm nostalgic glow and grain" },
        { title: "Neon Nights", tone: "purple", tag: "Cyberpunk", description: "Vibrant electric neon palette" },
        { title: "Golden Hour", tone: "gold", tag: "Sunset Mood", description: "Sun-drenched natural warmth" },
        { title: "Minimal White", tone: "blue", tag: "Editorial Clean", description: "Studio lighting and high contrast" },
        { title: "Cherry Blossom", tone: "pink", tag: "Pastel Dream", description: "Soft romantic tones and filters" },
        { title: "Cosmic Dream", tone: "blue", tag: "Futuristic", description: "Deep galaxy aura and shimmer" },
      ],
    },
    {
      type: "faq",
      eyebrow: "✦ Got Questions?",
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about bringing AIBOX to your event",
      items: [
        {
          question: "What is MagicBooth?",
          answer: "MagicBooth is an AI-powered photo experience that makes every event feel more playful, personal, and memorable.",
        },
        {
          question: "How does hand gesture control work?",
          answer: "Our camera detects simple hand movements, so guests can start a capture without touching the machine.",
        },
        {
          question: "What events is MagicBooth suitable for?",
          answer: "Weddings, brand activations, birthdays, launches, corporate events, and any celebration worth remembering.",
        },
        {
          question: "Do you ship the machine internationally?",
          answer: "Yes. We support events and installations internationally with delivery and setup options available.",
        },
        {
          question: "What is included with the purchase?",
          answer: "Every plan includes the booth experience, software, setup guidance, and access to our support team.",
        },
      ],
    },
    {
      type: "pricing",
      eyebrow: "✦ Flexible Investment",
      title: "Own Your aibox",
      subtitle: "Choose the package that fits your event venue or rental business",
      layout: "grid",
      plans: [
        {
          name: "Starter",
          price: "1000,00",
          period: "/ unit",
          description: "Ideal for boutique venues and private gatherings.",
          features: ["1 MagicBooth unit", "Up to 500 captures", "Standard support", "Basic theme pack"],
          cta: { label: "Order Starter", href: "#contact", style: { variant: "dark", size: "medium" } },
          featured: false,
        },
        {
          name: "Pro",
          price: "2000,00",
          period: "/ unit",
          badge: "POPULAR",
          description: "Best for high-traffic event planners and venues.",
          features: ["1 MagicBooth unit", "Up to 1,500 captures", "Pro frame themes", "Priority support", "Live QR gallery"],
          cta: { label: "Order Pro", href: "#contact", style: { variant: "primary", size: "medium" } },
          featured: true,
        },
        {
          name: "Business",
          price: "3000,00",
          period: "/ unit",
          badge: "ENTERPRISE",
          description: "Built for rental enterprises and global brand activations.",
          features: ["2 MagicBooth units", "Unlimited captures", "Custom event branding", "Dedicated support", "Hardware warranty"],
          cta: { label: "Order Business", href: "#contact", style: { variant: "dark", size: "medium" } },
          featured: false,
        },
      ],
    },
    {
      type: "contactForm",
      title: "Ready to Experience MagicBooth?",
      subtitle: "Get in touch with our team for orders, demos, and event bookings.",
      email: "contact@aibox.id",
      buttonStyle: { variant: "primary", size: "large" },
    },
  ];

  await prisma.page.upsert({
    where: { slug: "home" },
    update: {
      title: "AIBOX - AI-Powered Photobooth Experience",
      description: "The world's first AI-powered photobooth with gesture control — built for effortless, unforgettable moments.",
      blocks: aiboxHomeBlocks,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "home",
      title: "AIBOX - AI-Powered Photobooth Experience",
      description: "The world's first AI-powered photobooth with gesture control — built for effortless, unforgettable moments.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      blocks: aiboxHomeBlocks,
    },
  });

  await prisma.navigation.upsert({
    where: { id: "default-navigation" },
    update: {
      items: [
        { label: "Product", href: "#product" },
        { label: "Features", href: "#features" },
        { label: "Moments", href: "#moments" },
        { label: "FAQ", href: "#faq" },
        { label: "Pricing", href: "#pricing" },
        { label: "Contact", href: "#contact" },
      ],
    },
    create: {
      id: "default-navigation",
      items: [
        { label: "Product", href: "#product" },
        { label: "Features", href: "#features" },
        { label: "Moments", href: "#moments" },
        { label: "FAQ", href: "#faq" },
        { label: "Pricing", href: "#pricing" },
        { label: "Contact", href: "#contact" },
      ],
    },
  });

  const seedIps = [
    { ip: "127.0.0.1", label: "Localhost" },
    { ip: "::1", label: "Localhost IPv6" },
  ];

  for (const seed of seedIps) {
    await prisma.allowedIP.upsert({
      where: { ip: seed.ip },
      update: {},
      create: { ip: seed.ip, label: seed.label, enabled: true },
    });
  }

  console.log("Seed selesai: halaman home, navigasi, dan IP default dibuat.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());