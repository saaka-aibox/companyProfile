import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomExperience } from "../../../components/room/session/RoomExperience";
import { RoomShell } from "../../../components/room/session/RoomShell";

export const metadata: Metadata = {
  title: "AI Box Room",
  description: "Take a photostrip together, from separate devices.",
  robots: { index: false, follow: false },
};

async function Content({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return (
    <RoomShell>
      <RoomExperience roomId={roomId} />
    </RoomShell>
  );
}

// params are request data under Cache Components, so the whole page streams in behind Suspense.
export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}
