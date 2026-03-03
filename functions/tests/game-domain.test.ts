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
  assert.deepEqual(getArgumentBudgets("A"), {
    A: ARGUMENT_PENALIZED_SECONDS,
    B: ARGUMENT_BASE_SECONDS,
  });
  assert.deepEqual(getArgumentBudgets("B"), {
    A: ARGUMENT_BASE_SECONDS,
    B: ARGUMENT_PENALIZED_SECONDS,
  });
  assert.deepEqual(getArgumentBudgets(null), {
    A: ARGUMENT_BASE_SECONDS,
    B: ARGUMENT_BASE_SECONDS,
  });
});

test("choice resolution assigns missing choices and keeps both sides populated", () => {
  let calls = 0;
  const random = () => {
    calls += 1;
    if (calls === 1) return 0.9; // p3 missing -> B
    if (calls === 2) return 0.0; // forced assignment picks first source player
    return 0.5;
  };

  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3"],
    lockedChoices: { p1: "A", p2: "A" },
    random,
  });

  const sides = Object.values(result.choicesByPlayer);
  assert.ok(sides.includes("A"));
  assert.ok(sides.includes("B"));
  assert.equal(result.forcedAssignedPlayerId, null);
  assert.equal(result.forcedAssignedSide, null);
});

test("choice resolution force-assigns when one side is empty", () => {
  const result = resolveChoicePhase({
    playerIds: ["p1", "p2", "p3"],
    lockedChoices: { p1: "A", p2: "A", p3: "A" },
    random: () => 0,
  });

  assert.equal(result.forcedAssignedPlayerId, "p1");
  assert.equal(result.forcedAssignedSide, "B");
  assert.equal(result.choicesByPlayer.p1, "B");
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
    outcome: "A_WON",
    choicesByPlayer: { p1: "A", p2: "A", p3: "B" },
    forcedAssignedPlayerId: "p1",
  });
  assert.deepEqual(withBonus, { p1: 2, p2: 1, p3: 0 });

  const drawScores = computeScoreDeltas({
    outcome: "DRAW",
    choicesByPlayer: { p1: "A", p2: "B" },
    forcedAssignedPlayerId: "p1",
  });
  assert.deepEqual(drawScores, { p1: 0, p2: 0 });
});

test("pending penalty carryover applies to chosen side then clears", () => {
  const pending = createPendingPenaltyPlayerId("p2");
  assert.equal(pending, "p2");

  const applied = applyPendingPenalty({
    pendingPenaltyPlayerId: pending,
    choicesByPlayer: { p1: "A", p2: "B" },
  });

  assert.equal(applied.penalizedSide, "B");
  assert.equal(applied.nextPendingPenaltyPlayerId, null);

  const unresolved = applyPendingPenalty({
    pendingPenaltyPlayerId: "p2",
    choicesByPlayer: { p1: "A" },
  });
  assert.equal(unresolved.penalizedSide, null);
  assert.equal(unresolved.nextPendingPenaltyPlayerId, null);
});
