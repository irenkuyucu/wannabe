import assert from "node:assert/strict";
import test from "node:test";

import {
  HARD_TIMEOUT_MS,
  ROOM_TTL_MS,
  RoomLifecycleService,
  SOFT_TIMEOUT_MS,
} from "../src/domain/room-lifecycle";
import { RoundActionService } from "../src/domain/round-actions";
import { assertHttpsErrorCode, InMemoryRoomStore } from "./test-helpers";

async function createStartedGame(params?: {
  playerIds?: string[];
  nowMs?: number;
  lifecycleRandom?: () => number;
  actionRandom?: () => number;
}) {
  const store = new InMemoryRoomStore();
  let now = params?.nowMs ?? 1_710_000_000_000;
  const lifecycle = new RoomLifecycleService(
    store,
    () => now,
    params?.lifecycleRandom ?? (() => 0.000321),
  );
  const actions = new RoundActionService(
    store,
    () => now,
    params?.actionRandom ?? (() => 0.5),
  );
  const playerIds = params?.playerIds ?? ["host", "p2", "p3"];
  const [hostId, ...joiners] = playerIds;
  const joinerNames = ["Blake", "Casey", "Devon", "Elliot", "Frankie"];

  const created = await lifecycle.createRoom({
    uid: hostId,
    displayName: "Host",
  });

  for (const [index, joinerId] of joiners.entries()) {
    await lifecycle.joinRoom({
      uid: joinerId,
      roomCode: created.roomCode,
      displayName: joinerNames[index] ?? `Guest ${String.fromCharCode(65 + index)}`,
    });
  }

  for (const playerId of playerIds) {
    await lifecycle.setReady({
      uid: playerId,
      roomId: created.roomId,
      ready: true,
    });
  }

  await lifecycle.startGame({
    uid: hostId,
    roomId: created.roomId,
  });

  return {
    store,
    lifecycle,
    actions,
    created,
    playerIds,
    async refreshPresence(activePlayerIds = playerIds) {
      await Promise.all(
        activePlayerIds.map((playerId) =>
          store.updatePlayer(created.roomId, playerId, {
            lastSeenAtMs: now,
          }),
        ),
      );
    },
    get now() {
      return now;
    },
    set now(value: number) {
      now = value;
    },
  };
}

async function advanceToResolution(game: Awaited<ReturnType<typeof createStartedGame>>) {
  const [hostId, secondPlayerId] = game.playerIds;

  await game.actions.submitChoice({ uid: hostId, roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({
    uid: secondPlayerId,
    roomId: game.created.roomId,
    side: "B",
  });

  for (const playerId of game.playerIds.slice(2)) {
    await game.actions.submitChoice({
      uid: playerId,
      roomId: game.created.roomId,
      side: "A",
    });
  }

  await game.actions.endArgumentTurn({ uid: hostId, roomId: game.created.roomId });
  await game.actions.endArgumentTurn({ uid: secondPlayerId, roomId: game.created.roomId });
  await game.actions.advanceRebuttal({ uid: hostId, roomId: game.created.roomId });

  for (const playerId of game.playerIds) {
    await game.actions.submitVerdict({
      uid: playerId,
      roomId: game.created.roomId,
      verdict: "DRAW",
    });
  }
}

test("round actions support early progression across round phases", async () => {
  const game = await createStartedGame();

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "B" });
  await game.actions.submitChoice({ uid: "p3", roomId: game.created.roomId, side: "A" });

  const roomAfterChoices = await game.store.getRoom(game.created.roomId);
  assert.equal(roomAfterChoices?.phase, "argument");
  assert.equal(roomAfterChoices?.activeArgumentSide, "A");

  await assert.rejects(
    () => game.actions.endArgumentTurn({ uid: "p2", roomId: game.created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "permission-denied"),
  );

  assert.deepEqual(
    await game.actions.endArgumentTurn({ uid: "host", roomId: game.created.roomId }),
    { phase: "argument", activeArgumentSide: "B" },
  );
  assert.deepEqual(
    await game.actions.endArgumentTurn({ uid: "p2", roomId: game.created.roomId }),
    { phase: "rebuttal" },
  );

  await assert.rejects(
    () => game.actions.advanceRebuttal({ uid: "p2", roomId: game.created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "permission-denied"),
  );

  assert.deepEqual(
    await game.actions.advanceRebuttal({ uid: "host", roomId: game.created.roomId }),
    { phase: "verdict" },
  );

  await game.actions.submitVerdict({
    uid: "host",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });
  await game.actions.submitVerdict({
    uid: "p2",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });
  await game.actions.submitVerdict({
    uid: "p3",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });

  const resolvedRound = await game.store.getRound(game.created.roomId, 0);
  const host = await game.store.getPlayer(game.created.roomId, "host");
  const p2 = await game.store.getPlayer(game.created.roomId, "p2");
  const p3 = await game.store.getPlayer(game.created.roomId, "p3");
  assert.equal(resolvedRound?.outcome, "A_WON");
  assert.equal(host?.score, 1);
  assert.equal(p2?.score, 0);
  assert.equal(p3?.score, 1);

  const next = await game.actions.advanceResolution({
    uid: "host",
    roomId: game.created.roomId,
  });
  const roundOne = await game.store.getRound(game.created.roomId, 1);
  const roomAfterAdvance = await game.store.getRoom(game.created.roomId);

  assert.deepEqual(next, { nextState: "inGame", roundIndex: 1 });
  assert.equal(roomAfterAdvance?.phase, "choice");
  assert.equal(roomAfterAdvance?.currentPromptId, roundOne?.promptId);
  assert.notEqual(roundOne?.promptId, resolvedRound?.promptId);
});

test("tickRoom applies choice timeout, verdict timeout, and next-round dissenter penalty", async () => {
  const randomValues = [0, 0, 0, 0.75];
  let randomIndex = 0;
  const random = () => {
    const next = randomValues[randomIndex] ?? 0.5;
    randomIndex += 1;
    return next;
  };
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3", "p4"],
    actionRandom: random,
  });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });

  game.now += 60_000;
  await game.refreshPresence();
  const afterChoiceTick = await game.actions.tickRoom({
    uid: "host",
    roomId: game.created.roomId,
  });
  const roundZero = await game.store.getRound(game.created.roomId, 0);
  const roomAfterChoiceTick = await game.store.getRoom(game.created.roomId);

  assert.deepEqual(afterChoiceTick, {
    phase: "argument",
    roundIndex: 0,
    deadlineAtMs: game.now + 120_000,
  });
  const roundZeroChoices = Object.values(roundZero?.choicesByPlayer ?? {});
  assert.deepEqual(roundZero?.autoAssignedPlayerIds.sort(), ["p2", "p3", "p4"]);
  assert.equal(roundZero?.forceAssignedPlayerIds.length, 0);
  assert.equal(roundZero?.bonusEligiblePlayerId, null);
  assert.equal(roundZeroChoices.filter((side) => side === "A").length, 2);
  assert.equal(roundZeroChoices.filter((side) => side === "B").length, 2);
  assert.equal(roundZero?.choicesByPlayer.host, "A");
  assert.equal(roomAfterChoiceTick?.activeArgumentSide, "A");

  game.now += 120_000;
  await game.refreshPresence();
  await game.actions.tickRoom({ uid: "p2", roomId: game.created.roomId });
  game.now += 120_000;
  await game.refreshPresence();
  await game.actions.tickRoom({ uid: "p4", roomId: game.created.roomId });
  game.now += 60_000;
  await game.refreshPresence();
  await game.actions.tickRoom({ uid: "host", roomId: game.created.roomId });

  await game.actions.submitVerdict({
    uid: "host",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });
  await game.actions.submitVerdict({
    uid: "p2",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });
  await game.actions.submitVerdict({
    uid: "p3",
    roomId: game.created.roomId,
    verdict: "DRAW",
  });

  game.now += 60_000;
  await game.refreshPresence();
  const afterVerdictTick = await game.actions.tickRoom({
    uid: "p4",
    roomId: game.created.roomId,
  });
  const resolvedRound = await game.store.getRound(game.created.roomId, 0);
  const roomAtResolution = await game.store.getRoom(game.created.roomId);

  assert.deepEqual(afterVerdictTick, {
    phase: "resolution",
    roundIndex: 0,
    deadlineAtMs: null,
  });
  assert.equal(resolvedRound?.verdictsByPlayer.p4, "ABSTAIN");
  assert.equal(resolvedRound?.outcome, "DRAW");
  assert.equal(resolvedRound?.dissenterPlayerId, "p3");
  assert.equal(roomAtResolution?.pendingPenaltyPlayerId, "p3");

  await game.actions.advanceResolution({
    uid: "host",
    roomId: game.created.roomId,
  });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p3", roomId: game.created.roomId, side: "B" });
  await game.actions.submitChoice({ uid: "p4", roomId: game.created.roomId, side: "A" });

  const roundOne = await game.store.getRound(game.created.roomId, 1);
  const roomRoundOne = await game.store.getRoom(game.created.roomId);

  assert.equal(roundOne?.penalizedPlayerId, "p3");
  assert.equal(roomRoundOne?.activeArgumentSide, "B");
  assert.equal(roomRoundOne?.phaseDeadlineAtMs, game.now + 100_000);
  assert.equal(roomRoundOne?.pendingPenaltyPlayerId, null);
});

test("advanceResolution ends the room after the final round", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2"],
  });

  await game.store.updateRoom(game.created.roomId, { roundsTotal: 1 });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "B" });
  await game.actions.endArgumentTurn({ uid: "host", roomId: game.created.roomId });
  await game.actions.endArgumentTurn({ uid: "p2", roomId: game.created.roomId });
  await game.actions.advanceRebuttal({ uid: "host", roomId: game.created.roomId });
  await game.actions.submitVerdict({
    uid: "host",
    roomId: game.created.roomId,
    verdict: "DRAW",
  });
  await game.actions.submitVerdict({
    uid: "p2",
    roomId: game.created.roomId,
    verdict: "DRAW",
  });

  const result = await game.actions.advanceResolution({
    uid: "host",
    roomId: game.created.roomId,
  });
  const room = await game.store.getRoom(game.created.roomId);
  const round = await game.store.getRound(game.created.roomId, 0);

  assert.deepEqual(result, { nextState: "ended", roundIndex: 0 });
  assert.equal(room?.status, "ended");
  assert.equal(room?.phase, null);
  assert.equal(room?.currentPromptId, null);
  assert.equal(room?.expiresAtMs, game.now + ROOM_TTL_MS);
  assert.equal(round?.outcome, "DRAW");

  await assert.rejects(
    () =>
      game.lifecycle.joinRoom({
        uid: "p3",
        roomCode: game.created.roomCode,
        displayName: "Casey",
      }),
    (error: unknown) => assertHttpsErrorCode(error, "failed-precondition"),
  );
  await assert.rejects(
    () =>
      game.lifecycle.startGame({
        uid: "host",
        roomId: game.created.roomId,
      }),
    (error: unknown) => assertHttpsErrorCode(error, "failed-precondition"),
  );
});

test("advanceResolution auto-promotes the next remaining player when the host is missing", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
    actionRandom: () => 0,
  });

  await advanceToResolution(game);
  await game.store.deletePlayer(game.created.roomId, "host");

  await assert.rejects(
    () => game.actions.advanceResolution({ uid: "p3", roomId: game.created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "permission-denied"),
  );

  const roomAfterPromotion = await game.store.getRoom(game.created.roomId);
  assert.equal(roomAfterPromotion?.hostPlayerId, "p2");
  assert.equal(roomAfterPromotion?.hostPromotionNonce, 1);
  assert.equal(roomAfterPromotion?.lastPromotedHostPlayerId, "p2");

  const result = await game.actions.advanceResolution({
    uid: "p2",
    roomId: game.created.roomId,
  });
  const roomAfterAdvance = await game.store.getRoom(game.created.roomId);

  assert.deepEqual(result, { nextState: "inGame", roundIndex: 1 });
  assert.equal(roomAfterAdvance?.hostPlayerId, "p2");
  assert.equal(roomAfterAdvance?.phase, "choice");
});

test("in-game member actions promote a replacement host before resolution", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
    actionRandom: () => 0,
  });

  await game.store.deletePlayer(game.created.roomId, "host");

  await game.actions.submitChoice({
    uid: "p2",
    roomId: game.created.roomId,
    side: "A",
  });

  const roomAfterPromotion = await game.store.getRoom(game.created.roomId);
  const roundAfterChoice = await game.store.getRound(game.created.roomId, 0);

  assert.equal(roomAfterPromotion?.hostPlayerId, "p2");
  assert.equal(roomAfterPromotion?.hostPromotionNonce, 1);
  assert.equal(roomAfterPromotion?.lastPromotedHostPlayerId, "p2");
  assert.equal(roundAfterChoice?.choicesByPlayer.p2, "A");
});

test("stale players are pruned before choice submissions and no longer block phase advancement", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
  });

  await game.store.updatePlayer(game.created.roomId, "p3", {
    lastSeenAtMs: game.now - HARD_TIMEOUT_MS - 1,
  });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "B" });

  const room = await game.store.getRoom(game.created.roomId);
  const stalePlayer = await game.store.getPlayer(game.created.roomId, "p3");

  assert.equal(room?.phase, "argument");
  assert.equal(stalePlayer, null);
  await assert.rejects(
    () => game.actions.submitChoice({ uid: "p3", roomId: game.created.roomId, side: "A" }),
    (error: unknown) => assertHttpsErrorCode(error, "not-found"),
  );
});

test("soft-inactive players still remain in round membership until hard removal", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
  });

  await game.store.updatePlayer(game.created.roomId, "p3", {
    lastSeenAtMs: game.now - SOFT_TIMEOUT_MS - 1,
  });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "B" });

  const room = await game.store.getRoom(game.created.roomId);
  const softInactivePlayer = await game.store.getPlayer(game.created.roomId, "p3");

  assert.equal(room?.phase, "choice");
  assert.notEqual(softInactivePlayer, null);
});

test("resolution scoring ignores players removed for staleness mid-round", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
  });

  await game.actions.submitChoice({ uid: "host", roomId: game.created.roomId, side: "A" });
  await game.actions.submitChoice({ uid: "p2", roomId: game.created.roomId, side: "B" });
  await game.actions.submitChoice({ uid: "p3", roomId: game.created.roomId, side: "A" });
  await game.actions.endArgumentTurn({ uid: "host", roomId: game.created.roomId });
  await game.actions.endArgumentTurn({ uid: "p2", roomId: game.created.roomId });
  await game.actions.advanceRebuttal({ uid: "host", roomId: game.created.roomId });

  await game.store.updatePlayer(game.created.roomId, "p3", {
    lastSeenAtMs: game.now - HARD_TIMEOUT_MS - 1,
  });

  await game.actions.submitVerdict({
    uid: "host",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });
  await game.actions.submitVerdict({
    uid: "p2",
    roomId: game.created.roomId,
    verdict: "A_WON",
  });

  const host = await game.store.getPlayer(game.created.roomId, "host");
  const p2 = await game.store.getPlayer(game.created.roomId, "p2");
  const p3 = await game.store.getPlayer(game.created.roomId, "p3");
  const round = await game.store.getRound(game.created.roomId, 0);

  assert.equal(host?.score, 1);
  assert.equal(p2?.score, 0);
  assert.equal(p3, null);
  assert.equal(round?.verdictsByPlayer.p3, undefined);
  assert.equal(round?.outcome, "A_WON");
});

test("advanceResolution promotes a replacement host when the current host became stale", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2", "p3"],
    actionRandom: () => 0,
  });

  await advanceToResolution(game);
  await game.store.updatePlayer(game.created.roomId, "host", {
    lastSeenAtMs: game.now - SOFT_TIMEOUT_MS - 1,
  });

  await assert.rejects(
    () => game.actions.advanceResolution({ uid: "p3", roomId: game.created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "permission-denied"),
  );

  const room = await game.store.getRoom(game.created.roomId);
  assert.equal(room?.hostPlayerId, "p2");
  assert.equal(room?.hostPromotionNonce, 1);
  assert.equal(room?.lastPromotedHostPlayerId, "p2");
});

test("advanceResolution ends the room immediately when the host is missing and no players remain", async () => {
  const game = await createStartedGame({
    playerIds: ["host", "p2"],
  });

  await advanceToResolution(game);
  await game.store.deletePlayer(game.created.roomId, "host");
  await game.store.deletePlayer(game.created.roomId, "p2");

  const result = await game.actions.advanceResolution({
    uid: "host",
    roomId: game.created.roomId,
  });
  const room = await game.store.getRoom(game.created.roomId);

  assert.deepEqual(result, { nextState: "ended", roundIndex: 0 });
  assert.equal(room?.status, "ended");
  assert.equal(room?.phase, null);
  assert.equal(room?.pendingPenaltyPlayerId, null);
  assert.equal(room?.expiresAtMs, game.now + ROOM_TTL_MS);
});
