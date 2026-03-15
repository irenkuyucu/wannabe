import { notFound } from "next/navigation";

import { WannabeApp } from "@/components/wannabe-app";
import { normalizeRoomCodeInput } from "@/lib/lobby-utils";

type JoinRoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function JoinRoomPage({ params }: JoinRoomPageProps) {
  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCodeInput(roomCode);

  if (normalizedRoomCode.length !== 6 || normalizedRoomCode !== roomCode) {
    notFound();
  }

  return <WannabeApp initialInviteRoomCode={normalizedRoomCode} />;
}
