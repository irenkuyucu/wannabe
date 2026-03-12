const OUTCOME_LABELS = {
  A_WON: "Side A won",
  B_WON: "Side B won",
  DRAW: "Draw",
};

const VERDICT_LABELS = {
  A_WON: "A won",
  B_WON: "B won",
  DRAW: "Draw",
  ABSTAIN: "Abstain",
};

const OUTCOME_TO_SIDE = {
  A_WON: "A",
  B_WON: "B",
};

/**
 * @param {Record<string, "A_WON" | "B_WON" | "DRAW" | "ABSTAIN" | undefined> | undefined} verdictsByPlayer
 */
function buildVerdictCounts(verdictsByPlayer) {
  const verdicts = Object.values(verdictsByPlayer ?? {});

  return {
    A_WON: verdicts.filter((value) => value === "A_WON").length,
    B_WON: verdicts.filter((value) => value === "B_WON").length,
    DRAW: verdicts.filter((value) => value === "DRAW").length,
    ABSTAIN: verdicts.filter((value) => value === "ABSTAIN").length,
  };
}

function compareScoreboardEntries(a, b) {
  return (
    b.score - a.score ||
    a.joinedAtMs - b.joinedAtMs ||
    a.displayName.localeCompare(b.displayName)
  );
}

/**
 * @param {string | null | undefined} playerId
 * @param {{
 *   outcome?: "A_WON" | "B_WON" | "DRAW" | null;
 *   choicesByPlayer?: Record<string, "A" | "B" | undefined>;
 *   bonusEligiblePlayerId?: string | null;
 * } | null | undefined} round
 */
export function getRoundScoreDelta(playerId, round) {
  if (!playerId || !round?.outcome || round.outcome === "DRAW") {
    return 0;
  }

  const winningSide = OUTCOME_TO_SIDE[round.outcome];
  if (!winningSide) {
    return 0;
  }

  const chosenSide = round.choicesByPlayer?.[playerId];
  if (chosenSide !== winningSide) {
    return 0;
  }

  return 1 + (round.bonusEligiblePlayerId === playerId ? 1 : 0);
}

/**
 * @param {Array<{
 *   playerId: string;
 *   displayName: string;
 *   score: number;
 *   joinedAtMs: number;
 * }>} players
 * @param {{
 *   choicesByPlayer?: Record<string, "A" | "B" | undefined>;
 *   forceAssignedPlayerIds?: string[];
 *   bonusEligiblePlayerId?: string | null;
 *   verdictsByPlayer?: Record<string, "A_WON" | "B_WON" | "DRAW" | "ABSTAIN" | undefined>;
 *   outcome?: "A_WON" | "B_WON" | "DRAW" | null;
 *   dissenterPlayerId?: string | null;
 * } | null | undefined} round
 */
export function buildScoreboardEntries(players, round) {
  const scoreboard = players
    .map((player) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      score: player.score,
      joinedAtMs: player.joinedAtMs,
      choice: round?.choicesByPlayer?.[player.playerId] ?? null,
      verdict: round?.verdictsByPlayer?.[player.playerId] ?? null,
      scoreDelta: getRoundScoreDelta(player.playerId, round),
      wasForceAssigned: Boolean(round?.forceAssignedPlayerIds?.includes(player.playerId)),
      isBonusEligible: round?.bonusEligiblePlayerId === player.playerId,
      isDissenter: round?.dissenterPlayerId === player.playerId,
      rank: 0,
    }))
    .sort(compareScoreboardEntries);

  let previousScore = null;
  let previousRank = 0;

  scoreboard.forEach((entry, index) => {
    if (entry.score !== previousScore) {
      previousScore = entry.score;
      previousRank = index + 1;
    }

    entry.rank = previousRank;
  });

  return scoreboard;
}

function getOutcomeReason(outcome, nonAbstainingVerdicts) {
  if (!outcome) {
    return "Waiting for the round result to settle.";
  }

  if (outcome === "A_WON" || outcome === "B_WON") {
    return `All non-abstaining verdicts landed on ${VERDICT_LABELS[outcome]}.`;
  }

  if (nonAbstainingVerdicts.length === 0) {
    return "Nobody cast a non-abstaining verdict, so the round resolves to a draw.";
  }

  if (nonAbstainingVerdicts.length < 2) {
    return "Fewer than two non-abstaining verdicts came in, so the round resolves to a draw.";
  }

  return "Non-abstaining verdicts were split, so the round resolves to a draw.";
}

function formatNameList(names) {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * @param {{
 *   room?: { roundIndex?: number | null; roundsTotal?: number } | null;
 *   round?: {
 *     choicesByPlayer?: Record<string, "A" | "B" | undefined>;
 *     forceAssignedPlayerIds?: string[];
 *     bonusEligiblePlayerId?: string | null;
 *     verdictsByPlayer?: Record<string, "A_WON" | "B_WON" | "DRAW" | "ABSTAIN" | undefined>;
 *     outcome?: "A_WON" | "B_WON" | "DRAW" | null;
 *     dissenterPlayerId?: string | null;
 *   } | null;
 *   players: Array<{
 *     playerId: string;
 *     displayName: string;
 *     score: number;
 *     joinedAtMs: number;
 *   }>;
 * }} params
 */
export function buildResolutionSummary({ room, round, players }) {
  const scoreboard = buildScoreboardEntries(players, round);
  const verdictCounts = buildVerdictCounts(round?.verdictsByPlayer);
  const nonAbstainingVerdicts = Object.values(round?.verdictsByPlayer ?? {}).filter(
    (value) => value && value !== "ABSTAIN",
  );
  const isFinalRound =
    typeof room?.roundIndex === "number" &&
    typeof room?.roundsTotal === "number" &&
    room.roundIndex + 1 >= room.roundsTotal;
  const bonusPlayer =
    players.find((player) => player.playerId === round?.bonusEligiblePlayerId) ?? null;
  const dissenterPlayer =
    players.find((player) => player.playerId === round?.dissenterPlayerId) ?? null;

  return {
    scoreboard,
    outcome: round?.outcome ?? null,
    outcomeLabel: round?.outcome ? OUTCOME_LABELS[round.outcome] : "Resolving",
    outcomeReason: getOutcomeReason(round?.outcome ?? null, nonAbstainingVerdicts),
    verdictCounts,
    nonAbstainingCount: nonAbstainingVerdicts.length,
    bonusPlayer,
    dissenterPlayer,
    isFinalRound,
  };
}

/**
 * @param {Array<{
 *   playerId: string;
 *   displayName: string;
 *   score: number;
 *   joinedAtMs: number;
 * }>} players
 * @param {{
 *   choicesByPlayer?: Record<string, "A" | "B" | undefined>;
 *   forceAssignedPlayerIds?: string[];
 *   bonusEligiblePlayerId?: string | null;
 *   verdictsByPlayer?: Record<string, "A_WON" | "B_WON" | "DRAW" | "ABSTAIN" | undefined>;
 *   outcome?: "A_WON" | "B_WON" | "DRAW" | null;
 *   dissenterPlayerId?: string | null;
 * } | null | undefined} round
 */
export function buildGameOverSummary(players, round) {
  const scoreboard = buildScoreboardEntries(players, round);
  const topScore = scoreboard[0]?.score ?? null;
  const winners =
    topScore === null ? [] : scoreboard.filter((entry) => entry.score === topScore);
  const winnerNames = winners.map((winner) => winner.displayName);

  return {
    scoreboard,
    winners,
    headline:
      winners.length === 0
        ? "Game over."
        : winners.length === 1
          ? `${winnerNames[0]} wins the session.`
          : `${formatNameList(winnerNames)} tie for the session.`,
    supportingText:
      winners.length === 0
        ? "The room has ended."
        : `Final score${winners.length === 1 ? "" : "s"}: ${topScore}.`,
  };
}

export function formatOutcomeLabel(outcome) {
  return outcome ? OUTCOME_LABELS[outcome] : "Resolving";
}

export function formatVerdictLabel(verdict) {
  return verdict ? VERDICT_LABELS[verdict] : "Pending";
}
