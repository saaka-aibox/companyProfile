import type { Metadata } from "next";
import { ProfileShell } from "../../components/landing/profile/ProfileShell";
import { GamesHub } from "../../components/games/GamesHub";

export const metadata: Metadata = {
  title: "AIBox Games",
  description: "Hand-tracking games you play with your camera: Suit Arena, Irisan Buah, Kode Komando and Tepuk Sinkron. On one device or online with friends, each ending in an AI Box photo moment.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "AIBox Games",
    description: "Play with your hands, leave with a photo. Four hand-tracking games for one device or a room of friends.",
    url: "/games",
    siteName: "AIBox",
    type: "website",
    images: [{ url: "/images/aibox-photobooth-hero.webp", width: 1536, height: 1024, alt: "AIBox photobooth experience concept" }],
  },
};

export default function GamesPage() {
  return (
    <ProfileShell>
      <GamesHub />
    </ProfileShell>
  );
}
