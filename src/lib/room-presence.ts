import type { RoomDoc } from "@/lib/firebase-client";

export const ROOM_DISCONNECTED_MESSAGE = "You were removed from the room due to inactivity.";

export function shouldMaintainRoomPresence(params: {
  roomId: string | null;
  roomStatus: RoomDoc["status"] | null | undefined;
  currentPlayerId: string | null | undefined;
}) {
  const {
    roomId,
    roomStatus,
    currentPlayerId,
  } = params;

  return Boolean(roomId && currentPlayerId && roomStatus !== "ended");
}

export function shouldHandleLostRoomMembership(params: {
  roomId: string | null;
  roomStatus: RoomDoc["status"] | null | undefined;
  hasRoom: boolean;
  currentPlayerId: string | null | undefined;
  hadActiveMembership: boolean;
}) {
  const {
    roomId,
    roomStatus,
    hasRoom,
    currentPlayerId,
    hadActiveMembership,
  } = params;

  return Boolean(
    roomId &&
      hasRoom &&
      roomStatus !== "ended" &&
      !currentPlayerId &&
      hadActiveMembership,
  );
}

export function shouldEnterPresenceRecovery(params: {
  wasHidden: boolean;
  isVisible: boolean;
  roomId: string | null;
  roomStatus: RoomDoc["status"] | null | undefined;
  currentPlayerId: string | null | undefined;
}) {
  const {
    wasHidden,
    isVisible,
    roomId,
    roomStatus,
    currentPlayerId,
  } = params;

  return Boolean(
    wasHidden &&
      isVisible &&
      shouldMaintainRoomPresence({
        roomId,
        roomStatus,
        currentPlayerId,
      }),
  );
}
