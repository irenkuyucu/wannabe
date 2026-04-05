import { HttpsError } from "firebase-functions/v2/https";

import type { RoundOutcome, Side, VerdictVote } from "./game-domain";
import { createSessionPromptIdDeck } from "./prompt-deck";

export type RoomStatus = "lobby" | "inGame" | "ended";
export type GamePhase = "choice" | "argument" | "rebuttal" | "verdict" | "resolution";

export type RoomRecord = {
  roomId: string;
  roomCode: string;
  status: RoomStatus;
  hostPlayerId: string;
  hostPromotionNonce: number;
  lastPromotedHostPlayerId: string | null;
  roundsTotal: number;
  roundIndex: number | null;
  phase: GamePhase | null;
  phaseDeadlineAtMs: number | null;
  currentPromptId: string | null;
  activeArgumentSide: Side | null;
  pendingPenaltyPlayerId: string | null;
  createdAtMs: number;
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

export type PresenceRecord = {
  playerId: string;
  lastSeenAtMs: number;
};

export type RoundRecord = {
  roundIndex: number;
  promptId: string;
  choicesByPlayer: Partial<Record<string, Side>>;
  autoAssignedPlayerIds: string[];
  forceAssignedPlayerIds: string[];
  bonusEligiblePlayerId: string | null;
  verdictsByPlayer: Partial<Record<string, VerdictVote>>;
  outcome: RoundOutcome | null;
  dissenterPlayerId: string | null;
  penalizedPlayerId: string | null;
  startedAtMs: number;
  resolvedAtMs: number | null;
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

export type HeartbeatRoomResult = {
  ok: true;
};

export type SweepStaleRoomsResult = {
  roomsProcessed: number;
  playersRemoved: number;
};

export type StalePresenceMembership = {
  roomId: string;
  presence: PresenceRecord;
};

export type StaleRoomCleanupResult = {
  room: RoomRecord | null;
  players: PlayerRecord[];
  removedPlayerIds: string[];
  inactivePlayerIds: string[];
};

export type RoomLifecycleStore = {
  createRoom(record: RoomRecord): Promise<boolean>;
  getRoom(roomId: string): Promise<RoomRecord | null>;
  updateRoom(roomId: string, patch: Partial<RoomRecord>): Promise<void>;
  getRound(roomId: string, roundIndex: number): Promise<RoundRecord | null>;
  setRound(roomId: string, round: RoundRecord): Promise<void>;
  updateRound(
    roomId: string,
    roundIndex: number,
    patch: Partial<RoundRecord>,
  ): Promise<void>;
  updateRoundChoice(
    roomId: string,
    roundIndex: number,
    playerId: string,
    side: Side,
  ): Promise<void>;
  updateRoundVerdict(
    roomId: string,
    roundIndex: number,
    playerId: string,
    verdict: VerdictVote,
  ): Promise<void>;
  getPlayer(roomId: string, playerId: string): Promise<PlayerRecord | null>;
  setPlayer(roomId: string, player: PlayerRecord): Promise<void>;
  updatePlayer(roomId: string, playerId: string, patch: Partial<PlayerRecord>): Promise<void>;
  listPlayers(roomId: string): Promise<PlayerRecord[]>;
  setPresence(roomId: string, presence: PresenceRecord): Promise<void>;
  updatePresence(
    roomId: string,
    playerId: string,
    patch: Partial<PresenceRecord>,
  ): Promise<void>;
  listPresence(roomId: string): Promise<PresenceRecord[]>;
  listStalePresence(cutoffLastSeenAtMs: number): Promise<StalePresenceMembership[]>;
  deletePresence(roomId: string, playerId: string): Promise<void>;
  deletePlayer(roomId: string, playerId: string): Promise<void>;
};

const ROOM_CODE_REGEX = /^\d{6}$/;
const DISPLAY_NAME_ALLOWED_REGEX = /^[A-Za-z -]{1,12}$/;
const ROUND_COUNT_DEFAULT = 10;
export const CHOICE_PHASE_SECONDS = 60;
export const REBUTTAL_PHASE_SECONDS = 60;
export const VERDICT_PHASE_SECONDS = 60;
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const SOFT_TIMEOUT_MS = 45_000;
export const HARD_TIMEOUT_MS = 180_000;
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export function validateDisplayName(displayName: string): string {
  if (typeof displayName !== "string") {
    throw new HttpsError("invalid-argument", "displayName must be a string.");
  }

  const trimmed = displayName.trim();

  if (trimmed.length === 0 || trimmed.length > 12) {
    throw new HttpsError(
      "invalid-argument",
      "displayName must be between 1 and 12 characters.",
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
      "displayName may contain only ASCII letters, spaces, and hyphens.",
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

export function createRoundRecord(params: {
  roomId: string;
  roundIndex: number;
  roundsTotal: number;
  startedAtMs: number;
}): RoundRecord {
  const { roomId, roundIndex, roundsTotal, startedAtMs } = params;
  const promptId = createSessionPromptIdDeck({
    sessionKey: roomId,
    roundsTotal,
  })[roundIndex];

  if (!promptId) {
    throw new HttpsError("internal", "Unable to allocate prompt for round.");
  }

  return {
    roundIndex,
    promptId,
    choicesByPlayer: {},
    autoAssignedPlayerIds: [],
    forceAssignedPlayerIds: [],
    bonusEligiblePlayerId: null,
    verdictsByPlayer: {},
    outcome: null,
    dissenterPlayerId: null,
    penalizedPlayerId: null,
    startedAtMs,
    resolvedAtMs: null,
  };
}

export function createEndedRoomState(nowMs: number): {
  roomPatch: Pick<
    RoomRecord,
    | "status"
    | "phase"
    | "phaseDeadlineAtMs"
    | "currentPromptId"
    | "activeArgumentSide"
    | "pendingPenaltyPlayerId"
    | "expiresAtMs"
  >;
} {
  const expiresAtMs = nowMs + ROOM_TTL_MS;

  return {
    roomPatch: {
      status: "ended",
      phase: null,
      phaseDeadlineAtMs: null,
      currentPromptId: null,
      activeArgumentSide: null,
      pendingPenaltyPlayerId: null,
      expiresAtMs,
    },
  };
}

export function pickPromotedHost(
  players: PlayerRecord[],
  random: () => number = () => Math.random(),
): PlayerRecord {
  if (players.length === 0) {
    throw new HttpsError("failed-precondition", "Cannot promote a host without active players.");
  }

  const sortedPlayers = players.slice().sort((left, right) =>
    left.joinedAtMs === right.joinedAtMs
      ? left.playerId.localeCompare(right.playerId)
      : left.joinedAtMs - right.joinedAtMs,
  );
  const index = Math.min(
    sortedPlayers.length - 1,
    Math.max(0, Math.floor(random() * sortedPlayers.length)),
  );

  return sortedPlayers[index];
}

export function sortPlayersByJoinedAt(players: PlayerRecord[]): PlayerRecord[] {
  return players.slice().sort((left, right) =>
    left.joinedAtMs === right.joinedAtMs
      ? left.playerId.localeCompare(right.playerId)
      : left.joinedAtMs - right.joinedAtMs,
  );
}

function getPresenceLastSeenAtMs(
  playerId: string,
  presenceByPlayerId: Map<string, PresenceRecord>,
) {
  return presenceByPlayerId.get(playerId)?.lastSeenAtMs ?? Number.NEGATIVE_INFINITY;
}

export async function pruneStalePlayersForRoom(params: {
  store: RoomLifecycleStore;
  room: RoomRecord;
  nowMs: number;
  random?: () => number;
}): Promise<StaleRoomCleanupResult> {
  const {
    store,
    room,
    nowMs,
    random = () => Math.random(),
  } = params;
  const players = sortPlayersByJoinedAt(await store.listPlayers(room.roomId));
  const roomPresence = await store.listPresence(room.roomId);
  const presenceByPlayerId = new Map(
    roomPresence.map((presence) => [presence.playerId, presence]),
  );

  if (players.length === 0) {
    if (roomPresence.length > 0) {
      await Promise.all(
        roomPresence.map((presence) => store.deletePresence(room.roomId, presence.playerId)),
      );
    }
    return { room, players, removedPlayerIds: [], inactivePlayerIds: [] };
  }

  if (room.status === "ended") {
    return { room, players, removedPlayerIds: [], inactivePlayerIds: [] };
  }

  const softCutoffMs = nowMs - SOFT_TIMEOUT_MS;
  const hardCutoffMs = nowMs - HARD_TIMEOUT_MS;
  const inactivePlayers = players.filter(
    (player) =>
      getPresenceLastSeenAtMs(player.playerId, presenceByPlayerId) <= softCutoffMs &&
      getPresenceLastSeenAtMs(player.playerId, presenceByPlayerId) > hardCutoffMs,
  );
  const abandonedPlayers = players.filter(
    (player) => getPresenceLastSeenAtMs(player.playerId, presenceByPlayerId) <= hardCutoffMs,
  );

  if (inactivePlayers.length === 0 && abandonedPlayers.length === 0) {
    return { room, players, removedPlayerIds: [], inactivePlayerIds: [] };
  }

  if (abandonedPlayers.length > 0) {
    await Promise.all(
      abandonedPlayers.flatMap((player) => [
        store.deletePlayer(room.roomId, player.playerId),
        store.deletePresence(room.roomId, player.playerId),
      ]),
    );
  }

  if (room.status === "lobby") {
    const inactiveReadyPlayers = inactivePlayers.filter((player) => player.ready);
    await Promise.all(
      inactiveReadyPlayers.map((player) =>
        store.updatePlayer(room.roomId, player.playerId, { ready: false }),
      ),
    );
  }

  const remainingPlayers = sortPlayersByJoinedAt(await store.listPlayers(room.roomId));
  const remainingPresence = await store.listPresence(room.roomId);
  const remainingPresenceByPlayerId = new Map(
    remainingPresence.map((presence) => [presence.playerId, presence]),
  );

  if (remainingPlayers.length === 0) {
    if (remainingPresence.length > 0) {
      await Promise.all(
        remainingPresence.map((presence) => store.deletePresence(room.roomId, presence.playerId)),
      );
    }
    const ended = createEndedRoomState(nowMs);
    const endedRoom = { ...room, ...ended.roomPatch };
    await store.updateRoom(room.roomId, ended.roomPatch);

    return {
      room: endedRoom,
      players: [],
      removedPlayerIds: abandonedPlayers.map((player) => player.playerId),
      inactivePlayerIds: [],
    };
  }

  const remainingInactivePlayers = remainingPlayers.filter(
    (player) =>
      getPresenceLastSeenAtMs(player.playerId, remainingPresenceByPlayerId) <= softCutoffMs &&
      getPresenceLastSeenAtMs(player.playerId, remainingPresenceByPlayerId) > hardCutoffMs,
  );
  const remainingInactivePlayerIds = remainingInactivePlayers.map((player) => player.playerId);
  const remainingActivePlayers = remainingPlayers.filter(
    (player) => getPresenceLastSeenAtMs(player.playerId, remainingPresenceByPlayerId) > softCutoffMs,
  );
  const hostNeedsPromotion =
    abandonedPlayers.some((player) => player.playerId === room.hostPlayerId) ||
    remainingInactivePlayerIds.includes(room.hostPlayerId);

  if (!hostNeedsPromotion || remainingActivePlayers.length === 0) {
    return {
      room,
      players: remainingPlayers,
      removedPlayerIds: abandonedPlayers.map((player) => player.playerId),
      inactivePlayerIds: remainingInactivePlayerIds,
    };
  }

  const promotedHost = pickPromotedHost(remainingActivePlayers, random);
  const hostPromotionNonce = (room.hostPromotionNonce ?? 0) + 1;
  const nextRoom = {
    ...room,
    hostPlayerId: promotedHost.playerId,
    hostPromotionNonce,
    lastPromotedHostPlayerId: promotedHost.playerId,
  };
  await store.updateRoom(room.roomId, {
    hostPlayerId: promotedHost.playerId,
    hostPromotionNonce,
    lastPromotedHostPlayerId: promotedHost.playerId,
  });

  return {
    room: nextRoom,
    players: remainingPlayers,
    removedPlayerIds: abandonedPlayers.map((player) => player.playerId),
    inactivePlayerIds: remainingInactivePlayerIds,
  };
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

  async cleanupRoomPresence(roomIdInput: string): Promise<StaleRoomCleanupResult> {
    const roomId = validateRoomId(roomIdInput);
    const room = await this.store.getRoom(roomId);

    if (!room) {
      return {
        room: null,
        players: [],
        removedPlayerIds: [],
        inactivePlayerIds: [],
      };
    }

    return pruneStalePlayersForRoom({
      store: this.store,
      room,
      nowMs: this.nowMs(),
      random: this.random,
    });
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
      const roomId = roomCode;
      const created = await this.store.createRoom({
        roomId,
        roomCode,
        status: "lobby",
        hostPlayerId: uid,
        hostPromotionNonce: 0,
        lastPromotedHostPlayerId: null,
        roundsTotal: ROUND_COUNT_DEFAULT,
        roundIndex: null,
        phase: null,
        phaseDeadlineAtMs: null,
        currentPromptId: null,
        activeArgumentSide: null,
        pendingPenaltyPlayerId: null,
        createdAtMs: now,
        expiresAtMs: null,
      });

      if (!created) {
        continue;
      }

      await this.store.setPlayer(roomId, {
        playerId: uid,
        uid,
        displayName: assignedDisplayName,
        avatarId: avatarId ?? null,
        ready: false,
        score: 0,
        joinedAtMs: now,
      });
      await this.store.setPresence(roomId, {
        playerId: uid,
        lastSeenAtMs: now,
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
    const room = await this.store.getRoom(roomCode);
    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    if (room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Room is not joinable.");
    }

    const cleanedRoom = await this.cleanupRoomPresence(room.roomId);
    if (!cleanedRoom.room) {
      throw new HttpsError("not-found", "Room not found.");
    }
    if (cleanedRoom.room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Room is not joinable.");
    }

    const existingPlayer = await this.store.getPlayer(cleanedRoom.room.roomId, uid);
    if (existingPlayer) {
      await this.store.setPresence(cleanedRoom.room.roomId, {
        playerId: uid,
        lastSeenAtMs: this.nowMs(),
      });

      return {
        roomId: cleanedRoom.room.roomId,
        playerId: existingPlayer.playerId,
        assignedDisplayName: existingPlayer.displayName,
      };
    }

    const requestedName = validateDisplayName(params.displayName);
    const players = cleanedRoom.players;
    if (
      players.length > 0 &&
      !players.some((activePlayer) => activePlayer.playerId === cleanedRoom.room?.hostPlayerId)
    ) {
      const promotedHost = pickPromotedHost(players, this.random);
      await this.store.updateRoom(cleanedRoom.room.roomId, {
        hostPlayerId: promotedHost.playerId,
        hostPromotionNonce: (cleanedRoom.room.hostPromotionNonce ?? 0) + 1,
        lastPromotedHostPlayerId: promotedHost.playerId,
      });
    }
    const existingNames = new Set(players.map((player) => player.displayName));
    const assignedDisplayName = assignUniqueDisplayName(requestedName, existingNames);
    const now = this.nowMs();

    await this.store.setPlayer(cleanedRoom.room.roomId, {
      playerId: uid,
      uid,
      displayName: assignedDisplayName,
      avatarId: avatarId ?? null,
      ready: false,
      score: 0,
      joinedAtMs: now,
    });
    await this.store.setPresence(cleanedRoom.room.roomId, {
      playerId: uid,
      lastSeenAtMs: now,
    });

    return {
      roomId: cleanedRoom.room.roomId,
      playerId: uid,
      assignedDisplayName,
    };
  }

  async heartbeatRoom(params: { uid: string; roomId: string }): Promise<HeartbeatRoomResult> {
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

    const now = this.nowMs();
    await this.store.setPresence(roomId, {
      playerId: uid,
      lastSeenAtMs: now,
    });

    await this.cleanupRoomPresence(roomId);

    return { ok: true };
  }

  async sweepStaleRooms(): Promise<SweepStaleRoomsResult> {
    const now = this.nowMs();
    const stalePresence = await this.store.listStalePresence(now - SOFT_TIMEOUT_MS);
    const roomIds = [...new Set(stalePresence.map((membership) => membership.roomId))];

    let playersRemoved = 0;

    for (const roomId of roomIds) {
      const cleaned = await this.cleanupRoomPresence(roomId);
      playersRemoved += cleaned.removedPlayerIds.length;
    }

    return {
      roomsProcessed: roomIds.length,
      playersRemoved,
    };
  }

  async leaveRoom(params: { uid: string; roomId: string }): Promise<{ roomStatus: RoomStatus }> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const cleanedRoom = await this.cleanupRoomPresence(roomId);
    if (!cleanedRoom.room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const player = await this.store.getPlayer(roomId, uid);
    if (!player) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    await this.store.deletePlayer(roomId, uid);
    await this.store.deletePresence(roomId, uid);
    const remainingPlayers = await this.store.listPlayers(roomId);

    if (remainingPlayers.length === 0) {
      const ended = createEndedRoomState(this.nowMs());
      await this.store.updateRoom(roomId, ended.roomPatch);
      return { roomStatus: "ended" };
    }

    if (cleanedRoom.room.status !== "ended" && cleanedRoom.room.hostPlayerId === uid) {
      const newHost = pickPromotedHost(remainingPlayers, this.random);
      await this.store.updateRoom(roomId, {
        hostPlayerId: newHost.playerId,
        hostPromotionNonce: (cleanedRoom.room.hostPromotionNonce ?? 0) + 1,
        lastPromotedHostPlayerId: newHost.playerId,
      });
    }

    return { roomStatus: cleanedRoom.room.status };
  }

  async setReady(params: { uid: string; roomId: string; ready: boolean }): Promise<{ ready: boolean }> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const { ready } = params;

    if (typeof ready !== "boolean") {
      throw new HttpsError("invalid-argument", "ready must be a boolean.");
    }

    const cleanedRoom = await this.cleanupRoomPresence(roomId);
    if (!cleanedRoom.room) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const activeRoom = cleanedRoom.room;
    if (activeRoom.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Ready state can only be changed in lobby.");
    }

    const player = await this.store.getPlayer(roomId, uid);
    if (!player) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    const activePlayers = cleanedRoom.players;
    if (
      activePlayers.length > 0 &&
      !activePlayers.some((activePlayer) => activePlayer.playerId === activeRoom.hostPlayerId)
    ) {
      const promotedHost = pickPromotedHost(activePlayers, this.random);
      await this.store.updateRoom(roomId, {
        hostPlayerId: promotedHost.playerId,
        hostPromotionNonce: (activeRoom.hostPromotionNonce ?? 0) + 1,
        lastPromotedHostPlayerId: promotedHost.playerId,
      });
    }

    await this.store.setPlayer(roomId, { ...player, ready });
    return { ready };
  }

  async startGame(params: { uid: string; roomId: string }): Promise<StartGameResult> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const cleanedRoom = await this.cleanupRoomPresence(roomId);
    if (!cleanedRoom.room) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const activeRoom = cleanedRoom.room;
    if (activeRoom.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Game can only start from lobby.");
    }
    const activePlayers = cleanedRoom.players.filter(
      (player) => !cleanedRoom.inactivePlayerIds.includes(player.playerId),
    );
    let activeHostPlayerId = activeRoom.hostPlayerId;

    if (
      activePlayers.length > 0 &&
      !activePlayers.some((player) => player.playerId === activeRoom.hostPlayerId)
    ) {
      const promotedHost = pickPromotedHost(activePlayers, this.random);
      activeHostPlayerId = promotedHost.playerId;
      await this.store.updateRoom(roomId, {
        hostPlayerId: activeHostPlayerId,
        hostPromotionNonce: (activeRoom.hostPromotionNonce ?? 0) + 1,
        lastPromotedHostPlayerId: activeHostPlayerId,
      });
    }

    if (activeHostPlayerId !== uid) {
      throw new HttpsError("permission-denied", "Only host can start the game.");
    }
    if (activePlayers.length < 2) {
      throw new HttpsError(
        "failed-precondition",
        "At least two active players are required to start the game.",
      );
    }
    if (!activePlayers.every((player) => player.ready)) {
      throw new HttpsError(
        "failed-precondition",
        "All active players must be ready before the game can start.",
      );
    }

    const now = this.nowMs();
    const round = createRoundRecord({
      roomId,
      roundIndex: 0,
      roundsTotal: activeRoom.roundsTotal,
      startedAtMs: now,
    });
    const deadlineAtMs = now + CHOICE_PHASE_SECONDS * 1000;
    await this.store.updateRoom(roomId, {
      status: "inGame",
      roundIndex: 0,
      phase: "choice",
      phaseDeadlineAtMs: deadlineAtMs,
      currentPromptId: round.promptId,
      activeArgumentSide: null,
      pendingPenaltyPlayerId: null,
      expiresAtMs: null,
    });
    await this.store.setRound(roomId, round);

    return {
      roundIndex: 0,
      phase: "choice",
      deadlineAtMs,
    };
  }
}
