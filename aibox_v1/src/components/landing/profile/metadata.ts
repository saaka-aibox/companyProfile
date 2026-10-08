import type { Metadata } from "next";

export const nativePageMetadata = {
  home: { title: "AIBox — A little magic in every moment", description: "Meet MagicBooth: gesture-led photos and AI-generated frames for events, brands, and celebrations." },
  product: { title: "Meet MagicBooth — AIBox", description: "Explore the AIBox photobooth: gesture-led capture, custom AI-generated frames, prints, and digital keepsakes." },
  gallery: { title: "The frame collection — AIBox", description: "Explore visual directions and preview frame styles for your AIBox photo experience." },
  connect: { title: "Let’s make a moment — AIBox", description: "Plan an AIBox experience for your event, brand activation, wedding, or venue." },
  playground: { title: "The MagicBooth playground — AIBox", description: "Explore the MagicBooth concept in 3D and try optional browser-based hand gesture controls." },
} satisfies Record<string, Metadata>;
