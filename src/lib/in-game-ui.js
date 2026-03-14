const TIMED_PHASE_SECONDS = {
  choice: 60,
  rebuttal: 60,
  verdict: 60,
};

/**
 * @typedef {"A" | "B"} Side
 * @typedef {"A_WON" | "B_WON" | "DRAW" | "ABSTAIN"} VerdictVote
 */

/**
 * @param {number | null | undefined} roundIndex
 * @returns {[Side, Side]}
 */
export function getArgumentTurnOrder(roundIndex) {
  return Number.isInteger(roundIndex) && roundIndex % 2 === 1 ? ["B", "A"] : ["A", "B"];
}

/**
 * @param {string | null | undefined} penalizedPlayerId
 * @param {Partial<Record<string, Side>> | undefined} choicesByPlayer
 * @param {Side} side
 * @returns {number}
 */
export function getArgumentBudgetSeconds(penalizedPlayerId, choicesByPlayer, side) {
  return penalizedPlayerId && choicesByPlayer?.[penalizedPlayerId] === side ? 100 : 120;
}

/**
 * @param {number | null | undefined} deadlineAtMs
 * @param {number} nowMs
 * @returns {number | null}
 */
export function getCountdownSeconds(deadlineAtMs, nowMs) {
  if (typeof deadlineAtMs !== "number") {
    return null;
  }

  return Math.max(0, Math.ceil((deadlineAtMs - nowMs) / 1000));
}

/**
 * @param {{
 *   deadlineAtMs: number | null | undefined;
 *   nowMs: number;
 *   totalSeconds: number | null | undefined;
 * }} params
 * @returns {number}
 */
export function getCountdownProgress({ deadlineAtMs, nowMs, totalSeconds }) {
  if (typeof deadlineAtMs !== "number" || typeof totalSeconds !== "number" || totalSeconds <= 0) {
    return 0;
  }

  const totalMs = totalSeconds * 1000;
  const remainingMs = Math.max(0, deadlineAtMs - nowMs);
  const elapsedMs = Math.min(totalMs, Math.max(0, totalMs - remainingMs));
  return elapsedMs / totalMs;
}

/**
 * @param {{ playerId: string }[]} players
 * @param {string | null | undefined} currentPlayerId
 * @returns {number | null}
 */
export function getPhaseDriverDelayMs(players, currentPlayerId) {
  if (!currentPlayerId) {
    return null;
  }

  const driverIndex = players.findIndex((player) => player.playerId === currentPlayerId);
  if (driverIndex === -1) {
    return null;
  }

  return driverIndex * 450;
}

/**
 * @param {{
 *   room: {
 *     roundIndex: number | null;
 *     roundsTotal: number;
 *     phase: "choice" | "argument" | "rebuttal" | "verdict" | "resolution" | null;
 *     phaseDeadlineAtMs: number | null;
 *     hostPlayerId: string;
 *     activeArgumentSide: Side | null;
 *   } | null;
 *   round: {
 *     choicesByPlayer?: Record<string, Side | undefined>;
 *     verdictsByPlayer?: Record<string, VerdictVote | undefined>;
 *     penalizedPlayerId?: string | null;
 *   } | null;
 *   currentPlayerId: string | null;
 *   players: Array<{ playerId: string }>;
 *   nowMs: number;
 * }} params
 */
export function buildPhaseViewModel({
  room,
  round,
  currentPlayerId,
  players,
  nowMs,
}) {
  const roundNumber =
    typeof room?.roundIndex === "number" ? room.roundIndex + 1 : null;
  const [firstArgumentSide, secondArgumentSide] = getArgumentTurnOrder(room?.roundIndex ?? 0);
  const timedPhaseSeconds =
    room?.phase === "argument"
      ? getArgumentBudgetSeconds(
          round?.penalizedPlayerId ?? null,
          round?.choicesByPlayer,
          room.activeArgumentSide ?? firstArgumentSide,
        )
      : room?.phase
        ? (TIMED_PHASE_SECONDS[room.phase] ?? null)
        : null;
  const secondsRemaining = getCountdownSeconds(room?.phaseDeadlineAtMs, nowMs);
  const progressRatio =
    room?.phase === "resolution"
      ? 1
      : getCountdownProgress({
          deadlineAtMs: room?.phaseDeadlineAtMs,
          nowMs,
          totalSeconds: timedPhaseSeconds,
        });
  const selectedChoice = currentPlayerId ? round?.choicesByPlayer?.[currentPlayerId] ?? null : null;
  const selectedVerdict = currentPlayerId
    ? round?.verdictsByPlayer?.[currentPlayerId] ?? null
    : null;
  const speakingSide = room?.phase === "argument" ? room.activeArgumentSide : null;

  return {
    roundNumber,
    totalRounds: room?.roundsTotal ?? 0,
    phase: room?.phase ?? null,
    secondsRemaining,
    progressRatio,
    timedPhaseSeconds,
    selectedChoice,
    selectedVerdict,
    speakingSide,
    argumentOrder: [firstArgumentSide, secondArgumentSide],
    activeSideBudgetSeconds:
      room?.phase === "argument" && room.activeArgumentSide
        ? getArgumentBudgetSeconds(
            round?.penalizedPlayerId ?? null,
            round?.choicesByPlayer,
            room.activeArgumentSide,
          )
        : null,
    canSubmitChoice: room?.phase === "choice" && !selectedChoice,
    canEndArgumentTurn:
      room?.phase === "argument" &&
      Boolean(
        currentPlayerId &&
          room.activeArgumentSide &&
          round?.choicesByPlayer?.[currentPlayerId] === room.activeArgumentSide,
      ),
    canAdvanceRebuttal:
      room?.phase === "rebuttal" &&
      Boolean(currentPlayerId && room.hostPlayerId === currentPlayerId),
    canSubmitVerdict: room?.phase === "verdict" && !selectedVerdict,
    choiceCounts: {
      A: Object.values(round?.choicesByPlayer ?? {}).filter((value) => value === "A").length,
      B: Object.values(round?.choicesByPlayer ?? {}).filter((value) => value === "B").length,
    },
    verdictCounts: {
      A_WON: Object.values(round?.verdictsByPlayer ?? {}).filter((value) => value === "A_WON").length,
      B_WON: Object.values(round?.verdictsByPlayer ?? {}).filter((value) => value === "B_WON").length,
      DRAW: Object.values(round?.verdictsByPlayer ?? {}).filter((value) => value === "DRAW").length,
    },
    phaseDriverDelayMs: getPhaseDriverDelayMs(players, currentPlayerId),
  };
}
