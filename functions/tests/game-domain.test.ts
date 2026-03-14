import assert from "node:assert/strict";
import test from "node:test";

import {
  ARGUMENT_BASE_SECONDS,
  ARGUMENT_PENALIZED_SECONDS,
  applyPendingPenalty,
  computeRoundOutcome,
  computeScoreDeltas,
  createPendingPenaltyPlayerId,
  detectDissenter,
  getArgumentBudgets,
  getArgumentTurnOrder,
  resolveChoicePhase,
} from "../src/domain/game-domain";

test("argument turn order alternates by round index", () => {
  assert.deepEqual(getArgumentTurnOrder(0), ["A", "B"]);
  assert.deepEqual(getArgumentTurnOrder(1), ["B", "A"]);
  assert.deepEqual(getArgumentTurnOrder(8), ["A", "B"]);
});

test("argument turn order throws for invalid round index", () => {
  assert.throws(() => getArgumentTurnOrder(-1), /non-negative integer/i);
});

test("argument budgets apply a single-side penalty", () => {
  assert.deepEqual(
    getArgumentBudgets({
      penalizedPlayerId: "p1",
      choicesByPlayer: { p1: "A", p2: "B" },
    }),
    {
      A: ARGUMENT_PENALIZED_SECONDS,
      B: ARGUMENT_BASE_SECONDS,
    },
  );
  assert.deepEqual(
    getArgumentBudgets({
      penalizedPlayerId: "p2",
      choicesByPlayer: { p1: "A", p2: "B" },
    }),
    {
      A: ARGUMENT_BASE_SECONDS,
      B: ARGUMENT_PENALIZED_SECONDS,
    },
  );
  assert.deepEqual(
    getArgumentBudgets({
      penalizedPlayerId: null,
      choicesByPlayer: { p1: "A", p2: "B" },
    }),
    {
      A: ARGUMENT_BASE_SECONDS,
      B: ARGUMENT_BASE_SECONDS,
    },
  );
});

test("choice resolution keeps explicit uneven non-empty splits unchanged", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4"],
    lockedChoices: { p1: "A", p2: "A", p3: "A", p4: "B" },
    random: () => 0,
  });

  assert.deepEqual(result.choicesByPlayer, {
    p1: "A",
    p2: "A",
    p3: "A",
    p4: "B",
  });
  assert.deepEqual(result.autoAssignedPlayerIds, []);
  assert.deepEqual(result.forceAssignedPlayerIds, []);
  assert.equal(result.bonusEligiblePlayerId, "p4");
});

test("choice resolution assigns missing choices toward the most balanced final split", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4"],
    lockedChoices: { p1: "A", p2: "A", p3: "B" },
    random: () => 0,
  });

  assert.equal(result.choicesByPlayer.p4, "B");
  assert.deepEqual(result.autoAssignedPlayerIds, ["p4"]);
  assert.deepEqual(result.forceAssignedPlayerIds, []);
  assert.equal(result.bonusEligiblePlayerId, null);
});

test("choice resolution can resolve equally balanced missing-choice outcomes randomly", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3"],
    lockedChoices: { p1: "A" },
    random: () => 0.9,
  });

  assert.deepEqual(result.choicesByPlayer, {
    p1: "A",
    p2: "A",
    p3: "B",
  });
  assert.deepEqual(result.autoAssignedPlayerIds, ["p2", "p3"]);
  assert.deepEqual(result.forceAssignedPlayerIds, []);
  assert.equal(result.bonusEligiblePlayerId, "p3");
});

test("choice resolution balances missing choices before empty-side correction", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4"],
    lockedChoices: { p1: "A", p2: "A" },
    random: () => 0,
  });

  const sideACount = Object.values(result.choicesByPlayer).filter((side) => side === "A").length;
  const sideBCount = Object.values(result.choicesByPlayer).filter((side) => side === "B").length;

  assert.equal(sideACount, 2);
  assert.equal(sideBCount, 2);
  assert.deepEqual(result.autoAssignedPlayerIds, ["p3", "p4"]);
  assert.deepEqual(result.forceAssignedPlayerIds, []);
  assert.equal(result.bonusEligiblePlayerId, null);
});

test("choice resolution force-assigns the minimum number of players when a side is empty", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4", "p5"],
    lockedChoices: { p1: "A", p2: "A", p3: "A", p4: "A", p5: "A" },
    random: () => 0,
  });

  const sideACount = Object.values(result.choicesByPlayer).filter((side) => side === "A").length;
  const sideBCount = Object.values(result.choicesByPlayer).filter((side) => side === "B").length;

  assert.equal(sideACount, 3);
  assert.equal(sideBCount, 2);
  assert.deepEqual(result.autoAssignedPlayerIds, []);
  assert.equal(result.forceAssignedPlayerIds.length, 2);
  assert.equal(result.bonusEligiblePlayerId, null);
});

test("choice resolution force-assigns two players in a four-player empty-side split", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4"],
    lockedChoices: { p1: "A", p2: "A", p3: "A", p4: "A" },
    random: () => 0,
  });

  const sideACount = Object.values(result.choicesByPlayer).filter((side) => side === "A").length;
  const sideBCount = Object.values(result.choicesByPlayer).filter((side) => side === "B").length;

  assert.equal(sideACount, 2);
  assert.equal(sideBCount, 2);
  assert.deepEqual(result.autoAssignedPlayerIds, []);
  assert.equal(result.forceAssignedPlayerIds.length, 2);
  assert.equal(result.bonusEligiblePlayerId, null);
});

test("choice resolution marks the lone-side player as bonus-eligible", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3", "p4"],
    lockedChoices: { p1: "A", p2: "A", p3: "A", p4: "B" },
    random: () => 0,
  });

  assert.equal(result.bonusEligiblePlayerId, "p4");
});

test("choice resolution does not award a lone-side bonus in two-player rounds", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2"],
    lockedChoices: { p1: "A", p2: "B" },
    random: () => 0,
  });

  assert.equal(result.bonusEligiblePlayerId, null);
});

test("round outcome applies quorum before unanimity", () => {
  assert.equal(computeRoundOutcome({}), "DRAW");
  assert.equal(computeRoundOutcome({ p1: "A_WON", p2: "ABSTAIN" }), "DRAW");
  assert.equal(computeRoundOutcome({ p1: "A_WON", p2: "A_WON" }), "A_WON");
  assert.equal(
    computeRoundOutcome({ p1: "A_WON", p2: "A_WON", p3: "ABSTAIN" }),
    "A_WON",
  );
  assert.equal(
    computeRoundOutcome({ p1: "A_WON", p2: "B_WON", p3: "ABSTAIN" }),
    "DRAW",
  );
});

test("dissenter detection follows strict all-but-one rule", () => {
  assert.equal(
    detectDissenter({
      p1: "A_WON",
      p2: "A_WON",
      p3: "A_WON",
      p4: "DRAW",
    }),
    "p4",
  );

  assert.equal(
    detectDissenter({
      p1: "A_WON",
      p2: "B_WON",
    }),
    null,
  );

  assert.equal(
    detectDissenter({
      p1: "A_WON",
      p2: "B_WON",
      p3: "DRAW",
    }),
    null,
  );

  assert.equal(
    detectDissenter({
      p1: "ABSTAIN",
      p2: "ABSTAIN",
    }),
    null,
  );
});

test("score deltas apply winner points and forced assignment bonus", () => {
  const withBonus = computeScoreDeltas({
    outcome: "B_WON",
    choicesByPlayer: { p1: "A", p2: "A", p3: "B" },
    bonusEligiblePlayerId: "p3",
  });
  assert.deepEqual(withBonus, { p1: 0, p2: 0, p3: 2 });

  const drawScores = computeScoreDeltas({
    outcome: "DRAW",
    choicesByPlayer: { p1: "A", p2: "B" },
    bonusEligiblePlayerId: "p1",
  });
  assert.deepEqual(drawScores, { p1: 0, p2: 0 });

  const noTwoPlayerBonus = computeScoreDeltas({
    outcome: "A_WON",
    choicesByPlayer: { p1: "A", p2: "B" },
    bonusEligiblePlayerId: null,
  });
  assert.deepEqual(noTwoPlayerBonus, { p1: 1, p2: 0 });
});

test("pending penalty carryover applies to chosen side then clears", () => {
  const pending = createPendingPenaltyPlayerId("p2");
  assert.equal(pending, "p2");

  const applied = applyPendingPenalty({
    pendingPenaltyPlayerId: pending,
    choicesByPlayer: { p1: "A", p2: "B" },
  });

  assert.equal(applied.penalizedPlayerId, "p2");
  assert.equal(applied.nextPendingPenaltyPlayerId, null);

  const unresolved = applyPendingPenalty({
    pendingPenaltyPlayerId: "p2",
    choicesByPlayer: { p1: "A" },
  });
  assert.equal(unresolved.penalizedPlayerId, null);
  assert.equal(unresolved.nextPendingPenaltyPlayerId, null);
});
