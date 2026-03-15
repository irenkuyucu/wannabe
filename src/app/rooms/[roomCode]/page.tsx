import { notFound } from "next/navigation";

import { WannabeApp } from "@/components/wannabe-app";
import { normalizeRoomCodeInput } from "@/lib/lobby-utils";

type RoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCodeInput(roomCode);

  if (normalizedRoomCode.length !== 6 || normalizedRoomCode !== roomCode) {
    notFound();
  }

  return <WannabeApp initialLiveRoomCode={normalizedRoomCode} initialShowSplash={false} />;
}
