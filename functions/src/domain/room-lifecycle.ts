import { HttpsError } from "firebase-functions/v2/https";

export type RoomStatus = "lobby" | "inGame" | "ended";
export type GamePhase = "choice" | "argument" | "rebuttal" | "verdict" | "resolution";

export type RoomRecord = {
  roomId: string;
  roomCode: string;
  status: RoomStatus;
  hostPlayerId: string;
  roundsTotal: number;
  roundIndex: number | null;
  phase: GamePhase | null;
  phaseDeadlineAtMs: number | null;
  createdAtMs: number;
  expiresAtMs: number | null;
};

export type RoomCodeRecord = {
  roomCode: string;
  roomId: string;
  status: RoomStatus;
  expiresAtMs: number | null;
};

export type PlayerRecord = {
  playerId: string;
  uid: string;
  displayName: string;
  avatarId: string | null;
  ready: boolean;
  score: number;
  joinedAtMs: number;
};

export type CreateRoomResult = {
  roomId: string;
  roomCode: string;
  playerId: string;
  assignedDisplayName: string;
};

export type JoinRoomResult = {
  roomId: string;
  playerId: string;
  assignedDisplayName: string;
};

export type StartGameResult = {
  roundIndex: number;
  phase: "choice";
  deadlineAtMs: number;
};

export type RoomLifecycleStore = {
  generateRoomId(): string;
  reserveRoomCode(record: RoomCodeRecord): Promise<boolean>;
  getRoomCode(roomCode: string): Promise<RoomCodeRecord | null>;
  updateRoomCode(roomCode: string, patch: Partial<RoomCodeRecord>): Promise<void>;
  createRoom(record: RoomRecord): Promise<void>;
  getRoom(roomId: string): Promise<RoomRecord | null>;
  updateRoom(roomId: string, patch: Partial<RoomRecord>): Promise<void>;
  getPlayer(roomId: string, playerId: string): Promise<PlayerRecord | null>;
  setPlayer(roomId: string, player: PlayerRecord): Promise<void>;
  listPlayers(roomId: string): Promise<PlayerRecord[]>;
  deletePlayer(roomId: string, playerId: string): Promise<void>;
};

const ROOM_CODE_REGEX = /^\d{6}$/;
const DISPLAY_NAME_ALLOWED_REGEX = /^[A-Za-z' -]{1,16}$/;
const ROUND_COUNT_DEFAULT = 10;
const CHOICE_PHASE_SECONDS = 60;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export function validateDisplayName(displayName: string): string {
  if (typeof displayName !== "string") {
    throw new HttpsError("invalid-argument", "displayName must be a string.");
  }

  const trimmed = displayName.trim();

  if (trimmed.length === 0 || trimmed.length > 16) {
    throw new HttpsError(
      "invalid-argument",
      "displayName must be between 1 and 16 characters.",
    );
  }

  if (trimmed !== displayName) {
    throw new HttpsError(
      "invalid-argument",
      "displayName cannot include leading or trailing spaces.",
    );
  }

  if (!DISPLAY_NAME_ALLOWED_REGEX.test(trimmed) || !/[A-Za-z]/.test(trimmed)) {
    throw new HttpsError(
      "invalid-argument",
      "displayName may contain only ASCII letters, spaces, hyphens, and apostrophes.",
    );
  }

  return trimmed;
}

export function validateRoomCode(roomCode: string): string {
  if (typeof roomCode !== "string" || !ROOM_CODE_REGEX.test(roomCode)) {
    throw new HttpsError("invalid-argument", "roomCode must be a 6-digit numeric string.");
  }
  return roomCode;
}

export function validateRoomId(roomId: string): string {
  if (typeof roomId !== "string" || roomId.length === 0 || roomId.includes("/")) {
    throw new HttpsError("invalid-argument", "roomId must be a non-empty document id.");
  }
  return roomId;
}

function generateRoomCode(random: () => number): string {
  return Math.floor(random() * 1_000_000)
    .toString()
    .padStart(6, "0");
}

export function assignUniqueDisplayName(
  requestedName: string,
  existingDisplayNames: Set<string>,
): string {
  if (!existingDisplayNames.has(requestedName)) {
    return requestedName;
  }

  for (let suffix = 2; suffix < 5000; suffix += 1) {
    const candidate = `${requestedName} (${suffix})`;
    if (!existingDisplayNames.has(candidate)) {
      return candidate;
    }
  }

  throw new HttpsError("resource-exhausted", "Unable to assign unique displayName.");
}

export class RoomLifecycleService {
  constructor(
    private readonly store: RoomLifecycleStore,
    private readonly nowMs: () => number = () => Date.now(),
    private readonly random: () => number = () => Math.random(),
  ) {}

  private requireUid(uid: string): string {
    if (typeof uid !== "string" || uid.length === 0) {
      throw new HttpsError("invalid-argument", "uid must be a non-empty string.");
    }
    return uid;
  }

  async createRoom(params: {
    uid: string;
    displayName: string;
    avatarId?: string;
  }): Promise<CreateRoomResult> {
    const uid = this.requireUid(params.uid);
    const { avatarId } = params;
    const assignedDisplayName = validateDisplayName(params.displayName);
    const now = this.nowMs();

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const roomCode = generateRoomCode(this.random);
      const roomId = this.store.generateRoomId();

      const reserved = await this.store.reserveRoomCode({
        roomCode,
        roomId,
        status: "lobby",
        expiresAtMs: null,
      });

      if (!reserved) {
        continue;
      }

      await this.store.createRoom({
        roomId,
        roomCode,
        status: "lobby",
        hostPlayerId: uid,
        roundsTotal: ROUND_COUNT_DEFAULT,
        roundIndex: null,
        phase: null,
        phaseDeadlineAtMs: null,
        createdAtMs: now,
        expiresAtMs: null,
      });

      await this.store.setPlayer(roomId, {
        playerId: uid,
        uid,
        displayName: assignedDisplayName,
        avatarId: avatarId ?? null,
        ready: false,
        score: 0,
        joinedAtMs: now,
      });

      return {
        roomId,
        roomCode,
        playerId: uid,
        assignedDisplayName,
      };
    }

    throw new HttpsError("resource-exhausted", "Unable to allocate a room code.");
  }

  async joinRoom(params: {
    uid: string;
    roomCode: string;
    displayName: string;
    avatarId?: string;
  }): Promise<JoinRoomResult> {
    const uid = this.requireUid(params.uid);
    const { avatarId } = params;
    const roomCode = validateRoomCode(params.roomCode);
    const roomCodeRecord = await this.store.getRoomCode(roomCode);

    if (!roomCodeRecord) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = await this.store.getRoom(roomCodeRecord.roomId);
    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    if (room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Room is not joinable.");
    }

    const existingPlayer = await this.store.getPlayer(room.roomId, uid);
    if (existingPlayer) {
      return {
        roomId: room.roomId,
        playerId: existingPlayer.playerId,
        assignedDisplayName: existingPlayer.displayName,
      };
    }

    const requestedName = validateDisplayName(params.displayName);
    const players = await this.store.listPlayers(room.roomId);
    const existingNames = new Set(players.map((player) => player.displayName));
    const assignedDisplayName = assignUniqueDisplayName(requestedName, existingNames);

    await this.store.setPlayer(room.roomId, {
      playerId: uid,
      uid,
      displayName: assignedDisplayName,
      avatarId: avatarId ?? null,
      ready: false,
      score: 0,
      joinedAtMs: this.nowMs(),
    });

    return {
      roomId: room.roomId,
      playerId: uid,
      assignedDisplayName,
    };
  }

  async leaveRoom(params: { uid: string; roomId: string }): Promise<{ roomStatus: RoomStatus }> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const room = await this.store.getRoom(roomId);
    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const player = await this.store.getPlayer(roomId, uid);
    if (!player) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    await this.store.deletePlayer(roomId, uid);
    const remainingPlayers = await this.store.listPlayers(roomId);

    if (remainingPlayers.length === 0) {
      const expiresAtMs = this.nowMs() + ROOM_TTL_MS;
      await this.store.updateRoom(roomId, {
        status: "ended",
        phase: null,
        phaseDeadlineAtMs: null,
        expiresAtMs,
      });
      await this.store.updateRoomCode(room.roomCode, { status: "ended", expiresAtMs });
      return { roomStatus: "ended" };
    }

    if (room.hostPlayerId === uid) {
      const [newHost] = remainingPlayers.sort((a, b) =>
        a.joinedAtMs === b.joinedAtMs
          ? a.playerId.localeCompare(b.playerId)
          : a.joinedAtMs - b.joinedAtMs,
      );
      await this.store.updateRoom(roomId, { hostPlayerId: newHost.playerId });
    }

    return { roomStatus: room.status };
  }

  async setReady(params: { uid: string; roomId: string; ready: boolean }): Promise<{ ready: boolean }> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const { ready } = params;

    if (typeof ready !== "boolean") {
      throw new HttpsError("invalid-argument", "ready must be a boolean.");
    }

    const room = await this.store.getRoom(roomId);
    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }
    if (room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Ready state can only be changed in lobby.");
    }

    const player = await this.store.getPlayer(roomId, uid);
    if (!player) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    await this.store.setPlayer(roomId, { ...player, ready });
    return { ready };
  }

  async startGame(params: { uid: string; roomId: string }): Promise<StartGameResult> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const room = await this.store.getRoom(roomId);
    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }
    if (room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Game can only start from lobby.");
    }
    if (room.hostPlayerId !== uid) {
      throw new HttpsError("permission-denied", "Only host can start the game.");
    }

    const players = await this.store.listPlayers(roomId);
    if (players.length < 2) {
      throw new HttpsError(
        "failed-precondition",
        "At least two players are required to start the game.",
      );
    }
    if (!players.every((player) => player.ready)) {
      throw new HttpsError(
        "failed-precondition",
        "All players must be ready before the game can start.",
      );
    }

    const deadlineAtMs = this.nowMs() + CHOICE_PHASE_SECONDS * 1000;
    await this.store.updateRoom(roomId, {
      status: "inGame",
      roundIndex: 0,
      phase: "choice",
      phaseDeadlineAtMs: deadlineAtMs,
      expiresAtMs: null,
    });
    await this.store.updateRoomCode(room.roomCode, { status: "inGame", expiresAtMs: null });

    return {
      roundIndex: 0,
      phase: "choice",
      deadlineAtMs,
    };
  }
}
