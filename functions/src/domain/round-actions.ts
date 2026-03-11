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
  createRoundRecord,
  type GamePhase,
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
    return {
      room,
      player,
      players,
      roundIndex: requireActiveRound(room),
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
    await this.store.updateRoom(room.roomId, {
      status: "ended",
      phase: null,
      phaseDeadlineAtMs: null,
      currentPromptId: null,
      activeArgumentSide: null,
      pendingPenaltyPlayerId: null,
    });
    await this.store.updateRoomCode(room.roomCode, { status: "ended" });

    return {
      nextState: "ended",
      roundIndex: requireActiveRound(room),
    };
  }

  private async ensureResolutionHost(room: RoomRecord): Promise<
    | { players: PlayerRecord[]; hostPlayerId: string }
    | { endedResult: AdvanceResolutionResult }
  > {
    const players = sortPlayers(await this.store.listPlayers(room.roomId));
    let hostPlayerId = room.hostPlayerId;

    if (players.some((player) => player.playerId === hostPlayerId)) {
      return { players, hostPlayerId };
    }

    if (players.length === 0) {
      return {
        endedResult: await this.endRoomImmediately(room),
      };
    }

    hostPlayerId = players[0].playerId;
    await this.store.updateRoom(room.roomId, { hostPlayerId });

    return { players, hostPlayerId };
  }

  private async transitionChoiceToArgument(params: {
    room: RoomRecord;
    players: PlayerRecord[];
  }): Promise<TickRoomResult> {
    const { room, players } = params;
    const roundIndex = requireActiveRound(room);
    const round = await this.requireRound(room.roomId, roundIndex);
    const resolved = resolveChoicePhase({
      playerIds: players.map((player) => player.playerId),
      lockedChoices: round.choicesByPlayer,
      random: this.random,
    });
    const { penalizedSide, nextPendingPenaltyPlayerId } = applyPendingPenalty({
      pendingPenaltyPlayerId: room.pendingPenaltyPlayerId,
      choicesByPlayer: resolved.choicesByPlayer,
    });
    const [activeArgumentSide] = getArgumentTurnOrder(roundIndex);
    const deadlineAtMs =
      this.nowMs() + getArgumentBudgets(penalizedSide)[activeArgumentSide] * 1000;

    await this.store.updateRound(room.roomId, roundIndex, {
      choicesByPlayer: resolved.choicesByPlayer,
      forcedAssignedPlayerId: resolved.forcedAssignedPlayerId,
      forcedAssignedSide: resolved.forcedAssignedSide,
      penalizedSide,
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
    roundPenalizedSide: Side | null;
  }): Promise<TickRoomResult> {
    const { room, roundPenalizedSide } = params;
    const roundIndex = requireActiveRound(room);
    const activeArgumentSide = room.activeArgumentSide;

    if (!activeArgumentSide) {
      throw new HttpsError("internal", "Argument phase is missing active side state.");
    }

    const [firstSide, secondSide] = getArgumentTurnOrder(roundIndex);

    if (activeArgumentSide === firstSide) {
      const deadlineAtMs =
        this.nowMs() + getArgumentBudgets(roundPenalizedSide)[secondSide] * 1000;
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
    const { room, players } = params;
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
      forcedAssignedPlayerId: round.forcedAssignedPlayerId,
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
        roundPenalizedSide: round.penalizedSide,
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

    const choicesByPlayer = {
      ...round.choicesByPlayer,
      [uid]: side,
    };
    await this.store.updateRound(room.roomId, roundIndex, { choicesByPlayer });

    if (players.every((player) => choicesByPlayer[player.playerId])) {
      await this.transitionChoiceToArgument({
        room: { ...room, phase: "choice" },
        players,
      });
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
      roundPenalizedSide: round.penalizedSide,
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

    const verdictsByPlayer = {
      ...round.verdictsByPlayer,
      [uid]: verdict,
    };
    await this.store.updateRound(room.roomId, roundIndex, { verdictsByPlayer });

    if (players.every((player) => verdictsByPlayer[player.playerId])) {
      await this.transitionVerdictToResolution({
        room: { ...room, phase: "verdict" },
        players,
      });
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

    const hostResolution = await this.ensureResolutionHost(room);
    if ("endedResult" in hostResolution) {
      return hostResolution.endedResult;
    }
    const { players, hostPlayerId } = hostResolution;

    const caller = players.find((player) => player.playerId === uid);
    if (!caller) {
      throw new HttpsError("not-found", "Player is not in this room.");
    }

    if (uid !== hostPlayerId) {
      throw new HttpsError("permission-denied", "Only host can advance from resolution.");
    }

    const roundIndex = requireActiveRound(room);
    if (roundIndex + 1 >= room.roundsTotal) {
      return this.endRoomImmediately(room);
    }

    const nextRoundIndex = roundIndex + 1;
    const startedAtMs = this.nowMs();
    const nextRound = createRoundRecord({
      roomId,
      roundIndex: nextRoundIndex,
      roundsTotal: room.roundsTotal,
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
