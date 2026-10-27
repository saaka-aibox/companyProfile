import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameRunner } from "../../../components/games/GameRunner";
import { ProfileShell } from "../../../components/landing/profile/ProfileShell";
import { GAMES, GAME_IDS, isGameId } from "../../../lib/games/catalog";

type Params = { slug: string };


export function generateStaticParams(): Params[] {
  return GAME_IDS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isGameId(slug)) return {};
  const game = GAMES[slug];
  return {
    title: `${game.name} | AIBox Games`,
    description: `${game.subtitle}. ${game.blurb}`,
    alternates: { canonical: `/games/${slug}` },
    openGraph: {
      title: `${game.name} | AIBox Games`,
      description: game.subtitle,
      url: `/games/${slug}`,
      siteName: "AIBox",
      type: "website",
      images: [{ url: "/images/aibox-photobooth-hero.webp", width: 1536, height: 1024, alt: "AIBox photobooth experience concept" }],
    },
  };
}

export default async function GamePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!isGameId(slug)) notFound();
  return (
    <ProfileShell>
      <GameRunner slug={slug} />
    </ProfileShell>
  );
}
