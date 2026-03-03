import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

import { FirestoreRoomStore } from "./data/firestore-room-store";
import type {
  CreateRoomResult,
  JoinRoomResult,
  RoomStatus,
  StartGameResult,
} from "./domain/room-lifecycle";
import { RoomLifecycleService } from "./domain/room-lifecycle";
import { defineAuthedCallable } from "./shared/callable";
import { FUNCTION_REGION } from "./shared/constants";

type PingRequest = {
  message?: string;
};

type PingResponse = {
  ok: true;
  echo: string;
  region: string;
  uid: string;
};

type CreateRoomRequest = {
  displayName?: unknown;
  avatarId?: unknown;
};

type JoinRoomRequest = {
  roomCode?: unknown;
  displayName?: unknown;
  avatarId?: unknown;
};

type LeaveRoomRequest = {
  roomId?: unknown;
};

type SetReadyRequest = {
  roomId?: unknown;
  ready?: unknown;
};

type StartGameRequest = {
  roomId?: unknown;
};

type LeaveRoomResponse = {
  roomStatus: RoomStatus;
};

type SetReadyResponse = {
  ready: boolean;
};

const roomLifecycleService = new RoomLifecycleService(new FirestoreRoomStore());

function requireStringField(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${fieldName} must be a string.`);
  }
  return value;
}

function parseAvatarId(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "avatarId must be a string when provided.");
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  if (normalized.length > 64) {
    throw new HttpsError("invalid-argument", "avatarId must be 64 characters or fewer.");
  }

  return normalized;
}

export const ping = defineAuthedCallable<PingRequest, PingResponse>(
  async (request) => {
    const message = request.data?.message?.trim() || "pong";

    if (message.length > 64) {
      throw new HttpsError(
        "invalid-argument",
        "message must be 64 characters or fewer",
      );
    }

    logger.info("ping callable invoked", { uid: request.auth.uid });

    return {
      ok: true,
      echo: message,
      region: FUNCTION_REGION,
      uid: request.auth.uid,
    };
  },
);

export const createRoom = defineAuthedCallable<CreateRoomRequest, CreateRoomResult>(
  async (request) =>
    roomLifecycleService.createRoom({
      uid: request.auth.uid,
      displayName: requireStringField(request.data?.displayName, "displayName"),
      avatarId: parseAvatarId(request.data?.avatarId),
    }),
);

export const joinRoom = defineAuthedCallable<JoinRoomRequest, JoinRoomResult>(
  async (request) =>
    roomLifecycleService.joinRoom({
      uid: request.auth.uid,
      roomCode: requireStringField(request.data?.roomCode, "roomCode"),
      displayName: requireStringField(request.data?.displayName, "displayName"),
      avatarId: parseAvatarId(request.data?.avatarId),
    }),
);

export const leaveRoom = defineAuthedCallable<LeaveRoomRequest, LeaveRoomResponse>(
  async (request) =>
    roomLifecycleService.leaveRoom({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);

export const setReady = defineAuthedCallable<SetReadyRequest, SetReadyResponse>(
  async (request) => {
    if (typeof request.data?.ready !== "boolean") {
      throw new HttpsError("invalid-argument", "ready must be a boolean.");
    }

    return roomLifecycleService.setReady({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
      ready: request.data.ready,
    });
  },
);

export const startGame = defineAuthedCallable<StartGameRequest, StartGameResult>(
  async (request) =>
    roomLifecycleService.startGame({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);
