import type { Metadata } from "next";
import { RoomLanding } from "../../components/room/create/RoomLanding";
import { ProfileShell } from "../../components/landing/profile/ProfileShell";

const description = "An online photobox for up to 4 devices. Pay once, pose together, and download one AI Box photostrip.";

export const metadata: Metadata = {
  title: "AI Box Room",
  description,
  alternates: { canonical: "/room" },
  openGraph: { title: "AI Box Room", description, url: "/room", siteName: "AIBox", type: "website" },
};

export default function RoomPage() {
  return (
    <ProfileShell>
      <RoomLanding />
    </ProfileShell>
  );
}
