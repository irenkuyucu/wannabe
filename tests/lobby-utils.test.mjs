import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoomShareLink,
  buildRoomShareQuery,
  extractRoomCodeFromSearch,
  getAssignedNameNotice,
  getLobbyStartState,
  normalizeRoomCodeInput,
} from "../src/lib/lobby-utils.js";

test("normalizeRoomCodeInput strips non-digits and caps length", () => {
  assert.equal(normalizeRoomCodeInput("A1 2-3/4x567"), "123456");
});

test("share link helpers use query-format room links", () => {
  assert.equal(buildRoomShareQuery("048290"), "/?room=048290");
  assert.equal(
    buildRoomShareLink("https://wannabe.test", "048290"),
    "https://wannabe.test/?room=048290",
  );
});

test("extractRoomCodeFromSearch reads and normalizes the room query", () => {
  assert.equal(extractRoomCodeFromSearch("?room=12-34A56"), "123456");
  assert.equal(extractRoomCodeFromSearch("?other=1"), "");
});

test("getLobbyStartState enforces host, player count, and readiness", () => {
  assert.deepEqual(
    getLobbyStartState({
      currentPlayerId: "p2",
      hostPlayerId: "host",
      players: [{ playerId: "host", ready: true }, { playerId: "p2", ready: true }],
    }),
    {
      canStart: false,
      reason: "Only the host can start the game.",
    },
  );

  assert.deepEqual(
    getLobbyStartState({
      currentPlayerId: "host",
      hostPlayerId: "host",
      players: [{ playerId: "host", ready: true }],
    }),
    {
      canStart: false,
      reason: "At least two players are required.",
    },
  );

  assert.deepEqual(
    getLobbyStartState({
      currentPlayerId: "host",
      hostPlayerId: "host",
      players: [
        { playerId: "host", ready: true },
        { playerId: "p2", ready: false },
      ],
    }),
    {
      canStart: false,
      reason: "Everyone needs to be ready first.",
    },
  );

  assert.deepEqual(
    getLobbyStartState({
      currentPlayerId: "host",
      hostPlayerId: "host",
      players: [
        { playerId: "host", ready: true },
        { playerId: "p2", ready: true },
      ],
    }),
    {
      canStart: true,
      reason: "Ready to start.",
    },
  );
});

test("getAssignedNameNotice surfaces backend-assigned duplicates", () => {
  assert.equal(getAssignedNameNotice("Alex", "Alex (2)"), "Joined as Alex (2).");
  assert.equal(getAssignedNameNotice("Alex", "Alex"), null);
});
