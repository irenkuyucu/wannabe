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
import type {
  AdvanceResolutionResult,
  AdvanceRebuttalResult,
  EndArgumentTurnResult,
  TickRoomResult,
} from "./domain/round-actions";
import { RoundActionService } from "./domain/round-actions";
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

type TickRoomRequest = {
  roomId?: unknown;
};

type SubmitChoiceRequest = {
  roomId?: unknown;
  side?: unknown;
};

type EndArgumentTurnRequest = {
  roomId?: unknown;
};

type AdvanceRebuttalRequest = {
  roomId?: unknown;
};

type SubmitVerdictRequest = {
  roomId?: unknown;
  verdict?: unknown;
};

type AdvanceResolutionRequest = {
  roomId?: unknown;
};

type LeaveRoomResponse = {
  roomStatus: RoomStatus;
};

type SetReadyResponse = {
  ready: boolean;
};

const roomStore = new FirestoreRoomStore();
const roomLifecycleService = new RoomLifecycleService(roomStore);
const roundActionService = new RoundActionService(roomStore);

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

export const tickRoom = defineAuthedCallable<TickRoomRequest, TickRoomResult>(
  async (request) =>
    roundActionService.tickRoom({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);

export const submitChoice = defineAuthedCallable<SubmitChoiceRequest, { locked: true }>(
  async (request) =>
    roundActionService.submitChoice({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
      side: requireStringField(request.data?.side, "side"),
    }),
);

export const endArgumentTurn = defineAuthedCallable<
  EndArgumentTurnRequest,
  EndArgumentTurnResult
>(
  async (request) =>
    roundActionService.endArgumentTurn({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);

export const advanceRebuttal = defineAuthedCallable<
  AdvanceRebuttalRequest,
  AdvanceRebuttalResult
>(
  async (request) =>
    roundActionService.advanceRebuttal({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);

export const submitVerdict = defineAuthedCallable<SubmitVerdictRequest, { locked: true }>(
  async (request) =>
    roundActionService.submitVerdict({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
      verdict: requireStringField(request.data?.verdict, "verdict"),
    }),
);

export const advanceResolution = defineAuthedCallable<
  AdvanceResolutionRequest,
  AdvanceResolutionResult
>(
  async (request) =>
    roundActionService.advanceResolution({
      uid: request.auth.uid,
      roomId: requireStringField(request.data?.roomId, "roomId"),
    }),
);
