import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGameOverSummary,
  buildResolutionSummary,
  buildScoreboardEntries,
  getRoundScoreDelta,
} from "../src/lib/session-summary.js";

test("round score delta includes the lone-side bonus on a winning side", () => {
  assert.equal(
    getRoundScoreDelta("p2", {
      outcome: "B_WON",
      choicesByPlayer: { p1: "A", p2: "B", p3: "B" },
      bonusEligiblePlayerId: "p2",
    }),
    2,
  );
  assert.equal(
    getRoundScoreDelta("p1", {
      outcome: "B_WON",
      choicesByPlayer: { p1: "A", p2: "B" },
      bonusEligiblePlayerId: "p2",
    }),
    0,
  );
});

test("scoreboard entries sort by score and annotate round badges", () => {
  const scoreboard = buildScoreboardEntries(
    [
      { playerId: "p1", displayName: "Alex", score: 3, joinedAtMs: 1000 },
      { playerId: "p2", displayName: "Blair", score: 5, joinedAtMs: 900 },
      { playerId: "p3", displayName: "Casey", score: 5, joinedAtMs: 1100 },
    ],
    {
      outcome: "B_WON",
      choicesByPlayer: { p1: "A", p2: "B", p3: "B" },
      forceAssignedPlayerIds: ["p3"],
      bonusEligiblePlayerId: "p2",
      verdictsByPlayer: { p1: "A_WON", p2: "B_WON", p3: "ABSTAIN" },
      dissenterPlayerId: "p1",
    },
  );

  assert.deepEqual(
    scoreboard.map((entry) => ({
      playerId: entry.playerId,
      rank: entry.rank,
      scoreDelta: entry.scoreDelta,
      isBonusEligible: entry.isBonusEligible,
      wasForceAssigned: entry.wasForceAssigned,
      isDissenter: entry.isDissenter,
    })),
    [
      {
        playerId: "p2",
        rank: 1,
        scoreDelta: 2,
        isBonusEligible: true,
        wasForceAssigned: false,
        isDissenter: false,
      },
      {
        playerId: "p3",
        rank: 1,
        scoreDelta: 1,
        isBonusEligible: false,
        wasForceAssigned: true,
        isDissenter: false,
      },
      {
        playerId: "p1",
        rank: 3,
        scoreDelta: 0,
        isBonusEligible: false,
        wasForceAssigned: false,
        isDissenter: true,
      },
    ],
  );
});

test("resolution summary explains draw outcomes and final-round state", () => {
  const summary = buildResolutionSummary({
    room: { roundIndex: 9, roundsTotal: 10 },
    round: {
      outcome: "DRAW",
      choicesByPlayer: { p1: "A", p2: "B", p3: "B" },
      verdictsByPlayer: { p1: "A_WON", p2: "B_WON", p3: "ABSTAIN" },
      dissenterPlayerId: null,
      bonusEligiblePlayerId: null,
      forceAssignedPlayerIds: [],
    },
    players: [
      { playerId: "p1", displayName: "Alex", score: 4, joinedAtMs: 1000 },
      { playerId: "p2", displayName: "Blair", score: 4, joinedAtMs: 1100 },
      { playerId: "p3", displayName: "Casey", score: 2, joinedAtMs: 1200 },
    ],
  });

  assert.equal(summary.isFinalRound, true);
  assert.equal(summary.outcomeLabel, "Draw");
  assert.equal(
    summary.outcomeReason,
    "Non-abstaining verdicts were split, so the round resolves to a draw.",
  );
  assert.deepEqual(summary.verdictCounts, {
    A_WON: 1,
    B_WON: 1,
    DRAW: 0,
    ABSTAIN: 1,
  });
});

test("game-over summary surfaces ties cleanly", () => {
  const summary = buildGameOverSummary(
    [
      { playerId: "p1", displayName: "Alex", score: 6, joinedAtMs: 1000 },
      { playerId: "p2", displayName: "Blair", score: 6, joinedAtMs: 1100 },
      { playerId: "p3", displayName: "Casey", score: 4, joinedAtMs: 1200 },
    ],
    null,
  );

  assert.equal(summary.headline, "Alex and Blair tie for the session.");
  assert.equal(summary.supportingText, "Final scores: 6.");
  assert.deepEqual(
    summary.winners.map((winner) => winner.playerId),
    ["p1", "p2"],
  );
});
