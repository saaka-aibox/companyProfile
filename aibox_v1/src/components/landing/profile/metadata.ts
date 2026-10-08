import type { Metadata } from "next";

const pageMetadata = {
  home: { title: "AIBox — A little magic in every moment", description: "Meet MagicBooth: gesture-led photos and AI-generated frames for events, brands, and celebrations." },
  product: { title: "Meet MagicBooth — AIBox", description: "Explore the AIBox photobooth: gesture-led capture, custom AI-generated frames, prints, and digital keepsakes." },
  gallery: { title: "The frame collection — AIBox", description: "Explore visual directions and preview frame styles for your AIBox photo experience." },
  connect: { title: "Let’s make a moment — AIBox", description: "Plan an AIBox experience for your event, brand activation, wedding, or venue." },
  playground: { title: "The MagicBooth playground — AIBox", description: "Explore the MagicBooth concept in 3D and try optional browser-based hand gesture controls." },
} satisfies Record<string, Metadata>;

const pagePaths = { home: "/", product: "/product", gallery: "/gallery", connect: "/connect", playground: "/playground" };

function withSocialMetadata(key: keyof typeof pageMetadata): Metadata {
  const page = pageMetadata[key];
  return {
    ...page,
    alternates: { canonical: pagePaths[key] },
    openGraph: {
      title: page.title,
      description: page.description,
      url: pagePaths[key],
      siteName: "AIBox",
      type: "website",
      images: [{ url: "/images/aibox-photobooth-hero.webp", width: 1536, height: 1024, alt: "AIBox photobooth experience concept" }],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: ["/images/aibox-photobooth-hero.webp"] },
  };
}

export const nativePageMetadata = {
  home: withSocialMetadata("home"),
  product: withSocialMetadata("product"),
  gallery: withSocialMetadata("gallery"),
  connect: withSocialMetadata("connect"),
  playground: withSocialMetadata("playground"),
};
