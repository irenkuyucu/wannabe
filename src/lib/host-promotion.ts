import type { RoomDoc } from "@/lib/firebase-client";

export type HostPromotionNotice = {
  key: string;
  message: string;
};

export function getHostPromotionNotice(params: {
  currentPlayerId: string | null;
  room: Pick<
    RoomDoc,
    "roomId" | "hostPromotionNonce" | "lastPromotedHostPlayerId" | "hostPlayerId"
  > | null;
}): HostPromotionNotice | null {
  const { currentPlayerId, room } = params;

  if (!currentPlayerId || !room) {
    return null;
  }

  if (typeof room.hostPromotionNonce !== "number" || room.hostPromotionNonce <= 0) {
    return null;
  }

  if (
    room.lastPromotedHostPlayerId !== currentPlayerId ||
    room.hostPlayerId !== currentPlayerId
  ) {
    return null;
  }

  return {
    key: `${room.roomId}:host-promotion:${room.hostPromotionNonce}`,
    message: "You're now promoted to host",
  };
}
