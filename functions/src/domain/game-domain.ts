export type Side = "A" | "B";

export type VerdictVote = "A_WON" | "B_WON" | "DRAW" | "ABSTAIN";
export type RoundOutcome = "A_WON" | "B_WON" | "DRAW";

export const ARGUMENT_BASE_SECONDS = 120;
export const ARGUMENT_PENALIZED_SECONDS = 100;

type RandomFn = () => number;

export type ChoiceResolutionResult = {
  choicesByPlayer: Record<string, Side>;
  forceAssignedPlayerIds: string[];
  bonusEligiblePlayerId: string | null;
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
  const missingPlayerIds: string[] = [];
  let sideACount = 0;
  let sideBCount = 0;

  for (const playerId of playerIds) {
    const selected = lockedChoices[playerId];
    if (selected === "A" || selected === "B") {
      choicesByPlayer[playerId] = selected;
      if (selected === "A") {
        sideACount += 1;
      } else {
        sideBCount += 1;
      }
      continue;
    }

    missingPlayerIds.push(playerId);
  }

  const missingAssignedToA = chooseBalancedMissingAssignments({
    sideACount,
    sideBCount,
    missingCount: missingPlayerIds.length,
    random,
  });

  const missingAssignedToAIds = chooseRandomSubset(missingPlayerIds, missingAssignedToA, random);
  const missingAssignedToAIdSet = new Set(missingAssignedToAIds);

  for (const playerId of missingPlayerIds) {
    const assignedSide = missingAssignedToAIdSet.has(playerId) ? "A" : "B";
    choicesByPlayer[playerId] = assignedSide;
  }

  let sideAPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "A");
  let sideBPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "B");
  let forceAssignedPlayerIds: string[] = [];

  if (sideAPlayers.length === 0 || sideBPlayers.length === 0) {
    const sourcePlayers = sideAPlayers.length > 0 ? sideAPlayers : sideBPlayers;
    const forcedAssignedSide: Side = sideAPlayers.length > 0 ? "B" : "A";
    const moveCount = Math.floor(playerIds.length / 2);
    forceAssignedPlayerIds = chooseRandomSubset(sourcePlayers, moveCount, random).sort();

    for (const playerId of forceAssignedPlayerIds) {
      choicesByPlayer[playerId] = forcedAssignedSide;
    }

    sideAPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "A");
    sideBPlayers = playerIds.filter((playerId) => choicesByPlayer[playerId] === "B");
  }

  const bonusEligiblePlayerId = getBonusEligiblePlayerId({
    playerCountAtChoiceResolution: playerIds.length,
    sideAPlayers,
    sideBPlayers,
  });

  return {
    choicesByPlayer,
    forceAssignedPlayerIds,
    bonusEligiblePlayerId,
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
  bonusEligiblePlayerId: string | null;
}): Record<string, number> {
  const { outcome, choicesByPlayer, bonusEligiblePlayerId } = params;
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
    bonusEligiblePlayerId &&
    choicesByPlayer[bonusEligiblePlayerId] === winningSide
  ) {
    deltas[bonusEligiblePlayerId] += 1;
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

function chooseBalancedMissingAssignments(params: {
  sideACount: number;
  sideBCount: number;
  missingCount: number;
  random: RandomFn;
}) {
  const { sideACount, sideBCount, missingCount, random } = params;
  if (missingCount === 0) {
    return 0;
  }

  let bestDiff = Number.POSITIVE_INFINITY;
  const candidateCountsForA: number[] = [];

  for (let assignToA = 0; assignToA <= missingCount; assignToA += 1) {
    const finalSideACount = sideACount + assignToA;
    const finalSideBCount = sideBCount + (missingCount - assignToA);
    const diff = Math.abs(finalSideACount - finalSideBCount);

    if (diff < bestDiff) {
      bestDiff = diff;
      candidateCountsForA.length = 0;
      candidateCountsForA.push(assignToA);
      continue;
    }

    if (diff === bestDiff) {
      candidateCountsForA.push(assignToA);
    }
  }

  const randomIndex = Math.floor(random() * candidateCountsForA.length);
  return candidateCountsForA[randomIndex] ?? 0;
}

function chooseRandomSubset<T>(items: T[], count: number, random: RandomFn): T[] {
  if (count <= 0) {
    return [];
  }

  if (count >= items.length) {
    return items.slice();
  }

  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

function getBonusEligiblePlayerId(params: {
  playerCountAtChoiceResolution: number;
  sideAPlayers: string[];
  sideBPlayers: string[];
}) {
  const { playerCountAtChoiceResolution, sideAPlayers, sideBPlayers } = params;

  if (playerCountAtChoiceResolution < 3) {
    return null;
  }

  if (sideAPlayers.length === 1) {
    return sideAPlayers[0];
  }

  if (sideBPlayers.length === 1) {
    return sideBPlayers[0];
  }

  return null;
}
