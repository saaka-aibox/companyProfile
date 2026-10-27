import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileShell } from "../../../../components/landing/profile/ProfileShell";
import { ResultView } from "../../../../components/room/result/ResultView";

export const metadata: Metadata = {
  title: "Your AI Box Room strip",
  description: "Download, share or restyle your AI Box Room photostrip.",
  robots: { index: false, follow: false },
};

async function Content({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await params;
  return (
    <ProfileShell>
      <ResultView resultId={resultId} />
    </ProfileShell>
  );
}

// params are request data under Cache Components, so the whole page streams in behind Suspense.
export default function RoomResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}
