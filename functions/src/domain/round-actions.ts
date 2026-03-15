import { HttpsError } from "firebase-functions/v2/https";

import {
  applyPendingPenalty,
  computeRoundOutcome,
  computeScoreDeltas,
  createPendingPenaltyPlayerId,
  detectDissenter,
  getArgumentBudgets,
  getArgumentTurnOrder,
  type Side,
  resolveChoicePhase,
  type VerdictVote,
} from "./game-domain";
import {
  CHOICE_PHASE_SECONDS,
  createEndedRoomState,
  createRoundRecord,
  type GamePhase,
  pickPromotedHost,
  type PlayerRecord,
  REBUTTAL_PHASE_SECONDS,
  type RoomLifecycleStore,
  type RoomRecord,
  type RoomStatus,
  validateRoomId,
  VERDICT_PHASE_SECONDS,
} from "./room-lifecycle";

export type TickRoomResult = {
  phase: GamePhase;
  roundIndex: number;
  deadlineAtMs: number | null;
};

export type EndArgumentTurnResult = {
  phase: "argument" | "rebuttal";
  activeArgumentSide?: Side;
};

export type AdvanceRebuttalResult = {
  phase: "verdict";
};

export type AdvanceResolutionResult = {
  nextState: RoomStatus;
  roundIndex: number;
};

function validateSide(side: string): Side {
  if (side !== "A" && side !== "B") {
    throw new HttpsError("invalid-argument", "side must be either 'A' or 'B'.");
  }

  return side;
}

function validateVerdict(verdict: string): Exclude<VerdictVote, "ABSTAIN"> {
  if (verdict !== "A_WON" && verdict !== "B_WON" && verdict !== "DRAW") {
    throw new HttpsError(
      "invalid-argument",
      "verdict must be 'A_WON', 'B_WON', or 'DRAW'.",
    );
  }

  return verdict;
}

function sortPlayers(players: PlayerRecord[]): PlayerRecord[] {
  return players.slice().sort((left, right) =>
    left.joinedAtMs === right.joinedAtMs
      ? left.playerId.localeCompare(right.playerId)
      : left.joinedAtMs - right.joinedAtMs,
  );
}

function requireActiveRound(room: RoomRecord): number {
  if (room.roundIndex === null) {
    throw new HttpsError("failed-precondition", "Room does not have an active round.");
  }

  return room.roundIndex;
}

export class RoundActionService {
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

  private async loadMemberContext(uid: string, roomIdInput: string): Promise<{
    room: RoomRecord;
    player: PlayerRecord;
    players: PlayerRecord[];
    roundIndex: number;
  }> {
    const roomId = validateRoomId(roomIdInput);
    const room = await this.store.getRoom(roomId);

    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const player = await this.store.getPlayer(roomId, uid);
    if (!player) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    const players = sortPlayers(await this.store.listPlayers(roomId));
    const activeHost = await this.ensureActiveHost(room, players);

    if ("endedResult" in activeHost) {
      throw new HttpsError("failed-precondition", "Room is no longer active.");
    }

    return {
      room: activeHost.room,
      player,
      players: activeHost.players,
      roundIndex: requireActiveRound(activeHost.room),
    };
  }

  private async requireRound(roomId: string, roundIndex: number) {
    const round = await this.store.getRound(roomId, roundIndex);

    if (!round) {
      throw new HttpsError("internal", "Round state is missing.");
    }

    return round;
  }

  private requireInGamePhase(room: RoomRecord, phase: GamePhase) {
    if (room.status !== "inGame" || room.phase !== phase) {
      throw new HttpsError("failed-precondition", `Room must be in ${phase} phase.`);
    }
  }

  private async endRoomImmediately(room: RoomRecord): Promise<AdvanceResolutionResult> {
    const ended = createEndedRoomState(this.nowMs());
    await this.store.updateRoom(room.roomId, ended.roomPatch);

    return {
      nextState: "ended",
      roundIndex: requireActiveRound(room),
    };
  }

  private async ensureActiveHost(
    room: RoomRecord,
    playersInput?: PlayerRecord[],
  ): Promise<
    | { players: PlayerRecord[]; room: RoomRecord }
    | { endedResult: AdvanceResolutionResult }
  > {
    const players = sortPlayers(playersInput ?? (await this.store.listPlayers(room.roomId)));

    if (players.some((player) => player.playerId === room.hostPlayerId)) {
      return { players, room };
    }

    if (players.length === 0) {
      return {
        endedResult: await this.endRoomImmediately(room),
      };
    }

    const promotedHost = pickPromotedHost(players, this.random);
    const hostPromotionNonce = (room.hostPromotionNonce ?? 0) + 1;
    const nextRoom = {
      ...room,
      hostPlayerId: promotedHost.playerId,
      hostPromotionNonce,
      lastPromotedHostPlayerId: promotedHost.playerId,
    };
    await this.store.updateRoom(room.roomId, {
      hostPlayerId: promotedHost.playerId,
      hostPromotionNonce,
      lastPromotedHostPlayerId: promotedHost.playerId,
    });

    return { players, room: nextRoom };
  }

  private async transitionChoiceToArgument(params: {
    room: RoomRecord;
    players: PlayerRecord[];
  }): Promise<TickRoomResult> {
    const { players } = params;
    const latestRoom = await this.store.getRoom(params.room.roomId);

    if (
      !latestRoom ||
      latestRoom.status !== "inGame" ||
      latestRoom.phase !== "choice"
    ) {
      return {
        phase: latestRoom?.phase ?? "choice",
        roundIndex: latestRoom?.roundIndex ?? requireActiveRound(params.room),
        deadlineAtMs: latestRoom?.phaseDeadlineAtMs ?? params.room.phaseDeadlineAtMs,
      };
    }

    const room = latestRoom;
    const roundIndex = requireActiveRound(room);
    const round = await this.requireRound(room.roomId, roundIndex);
    const resolved = resolveChoicePhase({
      playerIds: players.map((player) => player.playerId),
      lockedChoices: round.choicesByPlayer,
      random: this.random,
    });
    const { penalizedPlayerId, nextPendingPenaltyPlayerId } = applyPendingPenalty({
      pendingPenaltyPlayerId: room.pendingPenaltyPlayerId,
      choicesByPlayer: resolved.choicesByPlayer,
    });
    const [activeArgumentSide] = getArgumentTurnOrder(roundIndex);
    const deadlineAtMs =
      this.nowMs() +
      getArgumentBudgets({
        penalizedPlayerId,
        choicesByPlayer: resolved.choicesByPlayer,
      })[activeArgumentSide] *
        1000;

    await this.store.updateRound(room.roomId, roundIndex, {
      choicesByPlayer: resolved.choicesByPlayer,
      autoAssignedPlayerIds: resolved.autoAssignedPlayerIds,
      forceAssignedPlayerIds: resolved.forceAssignedPlayerIds,
      bonusEligiblePlayerId: resolved.bonusEligiblePlayerId,
      penalizedPlayerId,
    });
    await this.store.updateRoom(room.roomId, {
      phase: "argument",
      phaseDeadlineAtMs: deadlineAtMs,
      activeArgumentSide,
      pendingPenaltyPlayerId: nextPendingPenaltyPlayerId,
    });

    return {
      phase: "argument",
      roundIndex,
      deadlineAtMs,
    };
  }

  private async transitionArgument(params: {
    room: RoomRecord;
    roundChoicesByPlayer: Partial<Record<string, Side>>;
    roundPenalizedPlayerId: string | null;
  }): Promise<TickRoomResult> {
    const { room, roundChoicesByPlayer, roundPenalizedPlayerId } = params;
    const roundIndex = requireActiveRound(room);
    const activeArgumentSide = room.activeArgumentSide;

    if (!activeArgumentSide) {
      throw new HttpsError("internal", "Argument phase is missing active side state.");
    }

    const [firstSide, secondSide] = getArgumentTurnOrder(roundIndex);

    if (activeArgumentSide === firstSide) {
      const deadlineAtMs =
        this.nowMs() +
        getArgumentBudgets({
          penalizedPlayerId: roundPenalizedPlayerId,
          choicesByPlayer: roundChoicesByPlayer,
        })[secondSide] *
          1000;
      await this.store.updateRoom(room.roomId, {
        phase: "argument",
        phaseDeadlineAtMs: deadlineAtMs,
        activeArgumentSide: secondSide,
      });

      return {
        phase: "argument",
        roundIndex,
        deadlineAtMs,
      };
    }

    if (activeArgumentSide !== secondSide) {
      throw new HttpsError("internal", "Argument phase is out of sync with round order.");
    }

    const deadlineAtMs = this.nowMs() + REBUTTAL_PHASE_SECONDS * 1000;
    await this.store.updateRoom(room.roomId, {
      phase: "rebuttal",
      phaseDeadlineAtMs: deadlineAtMs,
      activeArgumentSide: null,
    });

    return {
      phase: "rebuttal",
      roundIndex,
      deadlineAtMs,
    };
  }

  private async transitionRebuttalToVerdict(room: RoomRecord): Promise<TickRoomResult> {
    const roundIndex = requireActiveRound(room);
    const deadlineAtMs = this.nowMs() + VERDICT_PHASE_SECONDS * 1000;

    await this.store.updateRoom(room.roomId, {
      phase: "verdict",
      phaseDeadlineAtMs: deadlineAtMs,
      activeArgumentSide: null,
    });

    return {
      phase: "verdict",
      roundIndex,
      deadlineAtMs,
    };
  }

  private async transitionVerdictToResolution(params: {
    room: RoomRecord;
    players: PlayerRecord[];
  }): Promise<TickRoomResult> {
    const { players } = params;
    const latestRoom = await this.store.getRoom(params.room.roomId);

    if (
      !latestRoom ||
      latestRoom.status !== "inGame" ||
      latestRoom.phase !== "verdict"
    ) {
      return {
        phase: latestRoom?.phase ?? "verdict",
        roundIndex: latestRoom?.roundIndex ?? requireActiveRound(params.room),
        deadlineAtMs: latestRoom?.phaseDeadlineAtMs ?? params.room.phaseDeadlineAtMs,
      };
    }

    const room = latestRoom;
    const roundIndex = requireActiveRound(room);
    const round = await this.requireRound(room.roomId, roundIndex);
    const verdictsByPlayer: Partial<Record<string, VerdictVote>> = {};

    for (const player of players) {
      verdictsByPlayer[player.playerId] = round.verdictsByPlayer[player.playerId] ?? "ABSTAIN";
    }

    const outcome = computeRoundOutcome(verdictsByPlayer);
    const dissenterPlayerId = detectDissenter(verdictsByPlayer);
    const scoreDeltas = computeScoreDeltas({
      outcome,
      choicesByPlayer: round.choicesByPlayer as Record<string, Side>,
      bonusEligiblePlayerId: round.bonusEligiblePlayerId,
    });

    await Promise.all(
      players.map(async (player) => {
        const delta = scoreDeltas[player.playerId] ?? 0;
        if (delta === 0) {
          return;
        }

        await this.store.setPlayer(room.roomId, {
          ...player,
          score: player.score + delta,
        });
      }),
    );

    await this.store.updateRound(room.roomId, roundIndex, {
      verdictsByPlayer,
      outcome,
      dissenterPlayerId,
      resolvedAtMs: this.nowMs(),
    });
    await this.store.updateRoom(room.roomId, {
      phase: "resolution",
      phaseDeadlineAtMs: null,
      activeArgumentSide: null,
      pendingPenaltyPlayerId: createPendingPenaltyPlayerId(dissenterPlayerId),
    });

    return {
      phase: "resolution",
      roundIndex,
      deadlineAtMs: null,
    };
  }

  async tickRoom(params: { uid: string; roomId: string }): Promise<TickRoomResult> {
    const uid = this.requireUid(params.uid);
    const { room, players } = await this.loadMemberContext(uid, params.roomId);
    const roundIndex = requireActiveRound(room);

    if (room.status !== "inGame" || room.phase === null) {
      throw new HttpsError("failed-precondition", "Room is not currently in an active game.");
    }

    if (room.phaseDeadlineAtMs === null || this.nowMs() < room.phaseDeadlineAtMs) {
      return {
        phase: room.phase,
        roundIndex,
        deadlineAtMs: room.phaseDeadlineAtMs,
      };
    }

    if (room.phase === "choice") {
      return this.transitionChoiceToArgument({ room, players });
    }

    if (room.phase === "argument") {
      const round = await this.requireRound(room.roomId, roundIndex);
      return this.transitionArgument({
        room,
        roundChoicesByPlayer: round.choicesByPlayer,
        roundPenalizedPlayerId: round.penalizedPlayerId,
      });
    }

    if (room.phase === "rebuttal") {
      return this.transitionRebuttalToVerdict(room);
    }

    if (room.phase === "verdict") {
      return this.transitionVerdictToResolution({ room, players });
    }

    return {
      phase: room.phase,
      roundIndex,
      deadlineAtMs: room.phaseDeadlineAtMs,
    };
  }

  async submitChoice(params: { uid: string; roomId: string; side: string }): Promise<{ locked: true }> {
    const uid = this.requireUid(params.uid);
    const side = validateSide(params.side);
    const { room, players, roundIndex } = await this.loadMemberContext(uid, params.roomId);

    this.requireInGamePhase(room, "choice");

    const round = await this.requireRound(room.roomId, roundIndex);
    if (round.choicesByPlayer[uid]) {
      throw new HttpsError("failed-precondition", "Choice is already locked for this player.");
    }

    await this.store.updateRoundChoice(room.roomId, roundIndex, uid, side);
    const refreshedRound = await this.requireRound(room.roomId, roundIndex);

    if (players.every((player) => refreshedRound.choicesByPlayer[player.playerId])) {
      await this.transitionChoiceToArgument({ room, players });
    }

    return { locked: true };
  }

  async endArgumentTurn(params: { uid: string; roomId: string }): Promise<EndArgumentTurnResult> {
    const uid = this.requireUid(params.uid);
    const { room, roundIndex } = await this.loadMemberContext(uid, params.roomId);

    this.requireInGamePhase(room, "argument");

    const round = await this.requireRound(room.roomId, roundIndex);
    if (!room.activeArgumentSide) {
      throw new HttpsError("internal", "Argument phase is missing active side state.");
    }

    if (round.choicesByPlayer[uid] !== room.activeArgumentSide) {
      throw new HttpsError(
        "permission-denied",
        "Only a player on the currently speaking side can end the turn.",
      );
    }

    const next = await this.transitionArgument({
      room,
      roundChoicesByPlayer: round.choicesByPlayer,
      roundPenalizedPlayerId: round.penalizedPlayerId,
    });

    return next.phase === "argument"
      ? { phase: "argument", activeArgumentSide: (await this.store.getRoom(room.roomId))?.activeArgumentSide ?? undefined }
      : { phase: "rebuttal" };
  }

  async advanceRebuttal(params: { uid: string; roomId: string }): Promise<AdvanceRebuttalResult> {
    const uid = this.requireUid(params.uid);
    const { room } = await this.loadMemberContext(uid, params.roomId);

    this.requireInGamePhase(room, "rebuttal");

    if (room.hostPlayerId !== uid) {
      throw new HttpsError("permission-denied", "Only host can advance the rebuttal phase.");
    }

    await this.transitionRebuttalToVerdict(room);
    return { phase: "verdict" };
  }

  async submitVerdict(params: {
    uid: string;
    roomId: string;
    verdict: string;
  }): Promise<{ locked: true }> {
    const uid = this.requireUid(params.uid);
    const verdict = validateVerdict(params.verdict);
    const { room, players, roundIndex } = await this.loadMemberContext(uid, params.roomId);

    this.requireInGamePhase(room, "verdict");

    const round = await this.requireRound(room.roomId, roundIndex);
    if (round.verdictsByPlayer[uid]) {
      throw new HttpsError("failed-precondition", "Verdict is already locked for this player.");
    }

    await this.store.updateRoundVerdict(room.roomId, roundIndex, uid, verdict);
    const refreshedRound = await this.requireRound(room.roomId, roundIndex);

    if (players.every((player) => refreshedRound.verdictsByPlayer[player.playerId])) {
      await this.transitionVerdictToResolution({ room, players });
    }

    return { locked: true };
  }

  async advanceResolution(params: {
    uid: string;
    roomId: string;
  }): Promise<AdvanceResolutionResult> {
    const uid = this.requireUid(params.uid);
    const roomId = validateRoomId(params.roomId);
    const room = await this.store.getRoom(roomId);

    if (!room) {
      throw new HttpsError("not-found", "Room not found.");
    }

    this.requireInGamePhase(room, "resolution");

    const hostResolution = await this.ensureActiveHost(room);
    if ("endedResult" in hostResolution) {
      return hostResolution.endedResult;
    }
    const {
      players,
      room: activeRoom,
    } = hostResolution;

    const caller = players.find((player) => player.playerId === uid);
    if (!caller) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    if (uid !== activeRoom.hostPlayerId) {
      throw new HttpsError("permission-denied", "Only host can advance from resolution.");
    }

    const roundIndex = requireActiveRound(activeRoom);
    if (roundIndex + 1 >= activeRoom.roundsTotal) {
      return this.endRoomImmediately(activeRoom);
    }

    const nextRoundIndex = roundIndex + 1;
    const startedAtMs = this.nowMs();
    const nextRound = createRoundRecord({
      roomId,
      roundIndex: nextRoundIndex,
      roundsTotal: activeRoom.roundsTotal,
      startedAtMs,
    });
    const deadlineAtMs = startedAtMs + CHOICE_PHASE_SECONDS * 1000;

    await this.store.setRound(roomId, nextRound);
    await this.store.updateRoom(roomId, {
      roundIndex: nextRoundIndex,
      phase: "choice",
      phaseDeadlineAtMs: deadlineAtMs,
      currentPromptId: nextRound.promptId,
      activeArgumentSide: null,
    });

    return {
      nextState: "inGame",
      roundIndex: nextRoundIndex,
    };
  }
}
