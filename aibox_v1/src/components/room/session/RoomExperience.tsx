"use client";

import { useState } from "react";
import { mediaPipeLikelySupported } from "../../../lib/room/capture";
import type { JoinRes } from "../../../lib/room/protocol";
import { useLocalCamera } from "../../../lib/room/useLocalCamera";
import { JoinScreen } from "./JoinScreen";
import { LiveRoom } from "./LiveRoom";

/** Join screen first, then the live room. The camera outlives the switch. */
export function RoomExperience({ roomId }: { roomId: string }) {
  const camera = useLocalCamera();
  const [joined, setJoined] = useState<{ res: JoinRes; name: string; mp: boolean } | null>(null);

  if (!joined) {
    return <JoinScreen roomId={roomId} camera={camera} onJoined={(res, name) => setJoined({ res, name, mp: mediaPipeLikelySupported() })} />;
  }
  return <LiveRoom join={joined.res} name={joined.name} camera={camera} mp={joined.mp} />;
}
