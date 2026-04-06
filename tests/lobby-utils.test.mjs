import assert from "node:assert/strict";
import test from "node:test";

import lobbyUtilsModule from "../src/lib/lobby-utils.js";

const {
  buildJoinRoomPath,
  buildLiveRoomPath,
  buildRoomShareLink,
  getLobbyStartState,
  normalizeRoomCodeInput,
  parseRoomRouteState,
} = lobbyUtilsModule;

test("normalizeRoomCodeInput strips non-digits and caps length", () => {
  assert.equal(normalizeRoomCodeInput("A1 2-3/4x567"), "123456");
});

test("share link helpers use explicit query-state join and live routes", () => {
  assert.equal(buildJoinRoomPath("048290"), "/?join=048290");
  assert.equal(buildLiveRoomPath("048290"), "/?live=048290");
  assert.equal(
    buildRoomShareLink("https://wannabe.test", "048290"),
    "https://wannabe.test/?join=048290",
  );
});

test("parseRoomRouteState resolves live state before invite state and ignores invalid codes", () => {
  assert.deepEqual(parseRoomRouteState("?join=048290"), {
    inviteRoomCode: "048290",
    liveRoomCode: null,
  });
  assert.deepEqual(parseRoomRouteState("?live=112233"), {
    inviteRoomCode: null,
    liveRoomCode: "112233",
  });
  assert.deepEqual(parseRoomRouteState("?join=123&live=112233"), {
    inviteRoomCode: null,
    liveRoomCode: "112233",
  });
  assert.deepEqual(parseRoomRouteState("?join=abc"), {
    inviteRoomCode: null,
    liveRoomCode: null,
  });
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
