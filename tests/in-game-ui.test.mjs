import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPhaseViewModel,
  getArgumentBudgetSeconds,
  getArgumentTurnOrder,
  getCountdownProgress,
  getCountdownSeconds,
  getPhaseDriverDelayMs,
} from "../src/lib/in-game-ui.js";

test("argument turn order alternates by round index", () => {
  assert.deepEqual(getArgumentTurnOrder(0), ["A", "B"]);
  assert.deepEqual(getArgumentTurnOrder(1), ["B", "A"]);
  assert.deepEqual(getArgumentTurnOrder(8), ["A", "B"]);
});

test("argument budget applies the next-round penalty to one side only", () => {
  assert.equal(getArgumentBudgetSeconds("p2", { p2: "A" }, "A"), 100);
  assert.equal(getArgumentBudgetSeconds("p2", { p2: "A" }, "B"), 120);
  assert.equal(getArgumentBudgetSeconds(null, { p2: "B" }, "B"), 120);
});

test("countdown helpers clamp timed phase values", () => {
  assert.equal(getCountdownSeconds(61_000, 1_500), 60);
  assert.equal(getCountdownSeconds(10_000, 10_000), 0);
  assert.equal(getCountdownSeconds(null, 10_000), null);
  assert.equal(
    getCountdownProgress({
      deadlineAtMs: 65_000,
      nowMs: 35_000,
      totalSeconds: 60,
    }),
    0.5,
  );
});

test("phase driver delay staggers fallback tick callers by join order", () => {
  const players = [{ playerId: "host" }, { playerId: "p2" }, { playerId: "p3" }];

  assert.equal(getPhaseDriverDelayMs(players, "host"), 0);
  assert.equal(getPhaseDriverDelayMs(players, "p3"), 900);
  assert.equal(getPhaseDriverDelayMs(players, "ghost"), null);
});

test("phase view model exposes choice phase lock state and countdown", () => {
  const viewModel = buildPhaseViewModel({
    room: {
      roundIndex: 0,
      roundsTotal: 10,
      phase: "choice",
      phaseDeadlineAtMs: 160_000,
      hostPlayerId: "host",
      activeArgumentSide: null,
    },
    round: {
      choicesByPlayer: { host: "A" },
      verdictsByPlayer: {},
      penalizedSide: null,
    },
    currentPlayerId: "p2",
    players: [{ playerId: "host" }, { playerId: "p2" }],
    nowMs: 101_000,
  });

  assert.equal(viewModel.roundNumber, 1);
  assert.equal(viewModel.secondsRemaining, 59);
  assert.equal(viewModel.canSubmitChoice, true);
  assert.deepEqual(viewModel.choiceCounts, { A: 1, B: 0 });
});

test("phase view model exposes active argument side permissions and penalties", () => {
  const speakingView = buildPhaseViewModel({
    room: {
      roundIndex: 1,
      roundsTotal: 10,
      phase: "argument",
      phaseDeadlineAtMs: 280_000,
      hostPlayerId: "host",
      activeArgumentSide: "B",
    },
    round: {
      choicesByPlayer: { host: "A", p2: "B", p3: "B" },
      verdictsByPlayer: {},
      penalizedPlayerId: "p2",
    },
    currentPlayerId: "p2",
    players: [{ playerId: "host" }, { playerId: "p2" }, { playerId: "p3" }],
    nowMs: 200_000,
  });

  assert.deepEqual(speakingView.argumentOrder, ["B", "A"]);
  assert.equal(speakingView.activeSideBudgetSeconds, 100);
  assert.equal(speakingView.canEndArgumentTurn, true);

  const waitingView = buildPhaseViewModel({
    room: {
      roundIndex: 1,
      roundsTotal: 10,
      phase: "argument",
      phaseDeadlineAtMs: 280_000,
      hostPlayerId: "host",
      activeArgumentSide: "B",
    },
    round: {
      choicesByPlayer: { host: "A", p2: "B", p3: "B" },
      verdictsByPlayer: {},
      penalizedPlayerId: "p2",
    },
    currentPlayerId: "host",
    players: [{ playerId: "host" }, { playerId: "p2" }, { playerId: "p3" }],
    nowMs: 200_000,
  });

  assert.equal(waitingView.canEndArgumentTurn, false);
});

test("phase view model exposes rebuttal host control and verdict lock state", () => {
  const rebuttalView = buildPhaseViewModel({
    room: {
      roundIndex: 2,
      roundsTotal: 10,
      phase: "rebuttal",
      phaseDeadlineAtMs: 420_000,
      hostPlayerId: "host",
      activeArgumentSide: null,
    },
    round: {
      choicesByPlayer: { host: "A", p2: "B" },
      verdictsByPlayer: {},
      penalizedPlayerId: null,
    },
    currentPlayerId: "host",
    players: [{ playerId: "host" }, { playerId: "p2" }],
    nowMs: 390_500,
  });

  assert.equal(rebuttalView.canAdvanceRebuttal, true);
  assert.equal(rebuttalView.secondsRemaining, 30);

  const verdictView = buildPhaseViewModel({
    room: {
      roundIndex: 2,
      roundsTotal: 10,
      phase: "verdict",
      phaseDeadlineAtMs: 500_000,
      hostPlayerId: "host",
      activeArgumentSide: null,
    },
    round: {
      choicesByPlayer: { host: "A", p2: "B", p3: "B" },
      verdictsByPlayer: { host: "A_WON", p2: "DRAW" },
      penalizedPlayerId: null,
    },
    currentPlayerId: "host",
    players: [{ playerId: "host" }, { playerId: "p2" }, { playerId: "p3" }],
    nowMs: 470_010,
  });

  assert.equal(verdictView.canSubmitVerdict, false);
  assert.equal(verdictView.selectedVerdict, "A_WON");
  assert.deepEqual(verdictView.verdictCounts, { A_WON: 1, B_WON: 0, DRAW: 1 });
});

test("phase view model marks resolution as fully progressed", () => {
  const resolutionView = buildPhaseViewModel({
    room: {
      roundIndex: 4,
      roundsTotal: 10,
      phase: "resolution",
      phaseDeadlineAtMs: null,
      hostPlayerId: "host",
      activeArgumentSide: null,
    },
    round: {
      choicesByPlayer: { host: "A", p2: "B" },
      verdictsByPlayer: { host: "DRAW", p2: "DRAW" },
      penalizedPlayerId: null,
    },
    currentPlayerId: "host",
    players: [{ playerId: "host" }, { playerId: "p2" }],
    nowMs: 600_000,
  });

  assert.equal(resolutionView.secondsRemaining, null);
  assert.equal(resolutionView.progressRatio, 1);
});
