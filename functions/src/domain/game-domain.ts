export type Side = "A" | "B";

export type VerdictVote = "A_WON" | "B_WON" | "DRAW" | "ABSTAIN";
export type RoundOutcome = "A_WON" | "B_WON" | "DRAW";

export const ARGUMENT_BASE_SECONDS = 120;
export const ARGUMENT_PENALIZED_SECONDS = 100;

type RandomFn = () => number;

export type ChoiceResolutionResult = {
  choicesByPlayer: Record<string, Side>;
  forcedAssignedPlayerId: string | null;
  forcedAssignedSide: Side | null;
};

export function getArgumentTurnOrder(roundIndex: number): [Side, Side] {
  if (!Number.isInteger(roundIndex) || roundIndex < 0) {
    throw new RangeError("roundIndex must be a non-negative integer.");
  }
  return roundIndex % 2 === 0 ? ["A", "B"] : ["B", "A"];
}

export function getArgumentBudgets(penalizedSide: Side | null): Record<Side, number> {
  return {
    A: penalizedSide === "A" ? ARGUMENT_PENALIZED_SECONDS : ARGUMENT_BASE_SECONDS,
    B: penalizedSide === "B" ? ARGUMENT_PENALIZED_SECONDS : ARGUMENT_BASE_SECONDS,
  };
}

export function resolveChoicePhase(params: {
  playerIds: string[];
  lockedChoices: Partial<Record<string, Side>>;
  random?: RandomFn;
}): ChoiceResolutionResult {
  const { playerIds, lockedChoices, random = Math.random } = params;

  if (playerIds.length === 0) {
    throw new RangeError("playerIds cannot be empty.");
  }

  const choicesByPlayer: Record<string, Side> = {};

  for (const playerId of playerIds) {
    const selected = lockedChoices[playerId];
    choicesByPlayer[playerId] = selected === "A" || selected === "B"
      ? selected
      : random() < 0.5
      ? "A"
      : "B";
  }

  const sideAPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "A");
  const sideBPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "B");

  if (sideAPlayers.length > 0 && sideBPlayers.length > 0) {
    return {
      choicesByPlayer,
      forcedAssignedPlayerId: null,
      forcedAssignedSide: null,
    };
  }

  const sourcePlayers = sideAPlayers.length > 0 ? sideAPlayers : sideBPlayers;
  const forcedAssignedSide: Side = sideAPlayers.length > 0 ? "B" : "A";
  const randomIndex = Math.floor(random() * sourcePlayers.length);
  const forcedAssignedPlayerId = sourcePlayers[randomIndex];

  choicesByPlayer[forcedAssignedPlayerId] = forcedAssignedSide;

  return {
    choicesByPlayer,
    forcedAssignedPlayerId,
    forcedAssignedSide,
  };
}

export function computeRoundOutcome(
  verdictsByPlayer: Record<string, VerdictVote | undefined>,
): RoundOutcome {
  const nonAbstainVotes = Object.values(verdictsByPlayer).filter(
    (vote): vote is Exclude<VerdictVote, "ABSTAIN"> =>
      vote === "A_WON" || vote === "B_WON" || vote === "DRAW",
  );

  if (nonAbstainVotes.length < 2) {
    return "DRAW";
  }

  const firstVote = nonAbstainVotes[0];
  const unanimous = nonAbstainVotes.every((vote) => vote === firstVote);
  return unanimous ? firstVote : "DRAW";
}

export function detectDissenter(
  verdictsByPlayer: Record<string, VerdictVote | undefined>,
): string | null {
  const nonAbstainEntries = Object.entries(verdictsByPlayer).filter(([, vote]) =>
    vote === "A_WON" || vote === "B_WON" || vote === "DRAW"
  );

  if (nonAbstainEntries.length < 3) {
    return null;
  }

  const verdictBuckets = new Map<Exclude<VerdictVote, "ABSTAIN">, string[]>();

  for (const [playerId, vote] of nonAbstainEntries) {
    const key = vote as Exclude<VerdictVote, "ABSTAIN">;
    const bucket = verdictBuckets.get(key) ?? [];
    bucket.push(playerId);
    verdictBuckets.set(key, bucket);
  }

  if (verdictBuckets.size !== 2) {
    return null;
  }

  for (const players of verdictBuckets.values()) {
    if (players.length === 1) {
      return players[0];
    }
  }

  return null;
}

export function computeScoreDeltas(params: {
  outcome: RoundOutcome;
  choicesByPlayer: Record<string, Side>;
  forcedAssignedPlayerId: string | null;
}): Record<string, number> {
  const { outcome, choicesByPlayer, forcedAssignedPlayerId } = params;
  const deltas: Record<string, number> = {};

  for (const playerId of Object.keys(choicesByPlayer)) {
    deltas[playerId] = 0;
  }

  if (outcome === "DRAW") {
    return deltas;
  }

  const winningSide: Side = outcome === "A_WON" ? "A" : "B";

  for (const [playerId, choice] of Object.entries(choicesByPlayer)) {
    if (choice === winningSide) {
      deltas[playerId] += 1;
    }
  }

  if (
    forcedAssignedPlayerId &&
    choicesByPlayer[forcedAssignedPlayerId] === winningSide
  ) {
    deltas[forcedAssignedPlayerId] += 1;
  }

  return deltas;
}

export function createPendingPenaltyPlayerId(dissenterPlayerId: string | null): string | null {
  return dissenterPlayerId;
}

export function applyPendingPenalty(params: {
  pendingPenaltyPlayerId: string | null;
  choicesByPlayer: Partial<Record<string, Side>>;
}): { penalizedSide: Side | null; nextPendingPenaltyPlayerId: null } {
  const { pendingPenaltyPlayerId, choicesByPlayer } = params;
  const penalizedSide = pendingPenaltyPlayerId
    ? choicesByPlayer[pendingPenaltyPlayerId] ?? null
    : null;

  return {
    penalizedSide,
    nextPendingPenaltyPlayerId: null,
  };
}
