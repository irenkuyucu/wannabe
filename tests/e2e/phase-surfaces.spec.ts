import { expect, test } from "@playwright/test";

import { cleanupFirestoreTestEnv, clearFirestore } from "./helpers/firebase";
import { createLobbyActors, lookupRoom, seedRoomPhase } from "./helpers/game";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearFirestore();
});

test.afterAll(async () => {
  await cleanupFirestoreTestEnv();
});

test("seeded phase states render the redesigned argument, resolution, and end-game variants", async ({
  browser,
}) => {
  const {
    guestPages: [bobPage, charliePage],
    hostPage,
    roomCode,
  } = await createLobbyActors(browser, ["Alice", "Bob", "Charlie"]);

  await expect
    .poll(async () => (await lookupRoom(roomCode)).players.length, {
      timeout: 5000,
    })
    .toBe(3);

  const room = await lookupRoom(roomCode);
  const playersByName = new Map(room.players.map((player) => [player.displayName, player]));

  function playerId(displayName: string) {
    const player = playersByName.get(displayName);
    if (!player) {
      throw new Error(`Missing seeded player ${displayName}.`);
    }
    return player.playerId;
  }

  await seedRoomPhase({
    roomCode,
    roundIndex: 1,
    roundsTotal: 10,
    hostName: "Alice",
    playersByName: [
      { displayName: "Alice", ready: true, score: 3 },
      { displayName: "Bob", ready: true, score: 2 },
      { displayName: "Charlie", ready: true, score: 2 },
    ],
    roomPatch: {
      activeArgumentSide: "B",
      phase: "argument",
      phaseDeadlineAtMs: Date.now() + 45_000,
    },
    roundPatch: {
      autoAssignedPlayerIds: [playerId("Charlie")],
      choicesByPlayer: {
        [playerId("Alice")]: "A",
        [playerId("Bob")]: "B",
        [playerId("Charlie")]: "B",
      },
      penalizedPlayerId: playerId("Charlie"),
    },
  });

  await expect(hostPage.getByText(/^Side B is speaking$/i)).toBeVisible();
  await expect(hostPage.getByText(/charlie carries a 20s/i)).toBeVisible();
  await expect(hostPage.getByRole("button", { name: /hold to end turn/i })).toHaveCount(0);
  await expect(bobPage.getByRole("button", { name: /hold to end turn/i })).toBeVisible();

  await expect(charliePage.locator(".argument-screen-toast")).toContainText(
    /you’re assigned to side b|you're assigned to side b/i,
  );
  await expect(charliePage.locator(".argument-screen-toast")).toHaveCount(0, { timeout: 4000 });

  await seedRoomPhase({
    roomCode,
    roundIndex: 1,
    roundsTotal: 10,
    hostName: "Alice",
    playersByName: [
      { displayName: "Alice", ready: true, score: 3 },
      { displayName: "Bob", ready: true, score: 2 },
      { displayName: "Charlie", ready: true, score: 2 },
    ],
    roomPatch: {
      activeArgumentSide: "B",
      phase: "argument",
      phaseDeadlineAtMs: Date.now() + 45_000,
    },
    roundPatch: {
      choicesByPlayer: {
        [playerId("Alice")]: "A",
        [playerId("Bob")]: "B",
        [playerId("Charlie")]: "A",
      },
      forceAssignedPlayerIds: [playerId("Bob")],
    },
  });

  await expect(bobPage.locator(".argument-screen-toast")).toContainText(
    /you’re re-assigned to side b|you're re-assigned to side b/i,
  );

  await seedRoomPhase({
    roomCode,
    roundIndex: 2,
    roundsTotal: 10,
    hostName: "Alice",
    playersByName: [
      { displayName: "Alice", ready: true, score: 5 },
      { displayName: "Bob", ready: true, score: 4 },
      { displayName: "Charlie", ready: true, score: 4 },
    ],
    roomPatch: {
      activeArgumentSide: null,
      phase: "resolution",
      phaseDeadlineAtMs: null,
    },
    roundPatch: {
      choicesByPlayer: {
        [playerId("Alice")]: "A",
        [playerId("Bob")]: "A",
        [playerId("Charlie")]: "B",
      },
      dissenterPlayerId: playerId("Charlie"),
      outcome: "A_WON",
      resolvedAtMs: Date.now(),
      verdictsByPlayer: {
        [playerId("Alice")]: "A_WON",
        [playerId("Bob")]: "A_WON",
        [playerId("Charlie")]: "B_WON",
      },
    },
  });

  await expect(hostPage.getByText(/^Resolution$/i)).toBeVisible();
  await expect(hostPage.getByText(/^Dissenter!$/i)).toBeVisible();
  await expect(hostPage.getByRole("button", { name: /hold for next round/i })).toBeVisible();
  await expect(bobPage.getByText(/host will advance the game/i)).toBeVisible();
  const charlieRow = hostPage.locator(".results-scoreboard-row", { hasText: "Charlie" });
  await expect(charlieRow.getByText(/^Dissenter$/i)).toBeVisible();

  await seedRoomPhase({
    roomCode,
    roundIndex: 9,
    roundsTotal: 10,
    hostName: "Alice",
    playersByName: [
      { displayName: "Alice", ready: true, score: 7 },
      { displayName: "Bob", ready: true, score: 7 },
      { displayName: "Charlie", ready: true, score: 4 },
    ],
    roomPatch: {
      activeArgumentSide: null,
      phase: "resolution",
      phaseDeadlineAtMs: null,
    },
    roundPatch: {
      choicesByPlayer: {
        [playerId("Alice")]: "A",
        [playerId("Bob")]: "A",
        [playerId("Charlie")]: "B",
      },
      outcome: "A_WON",
      resolvedAtMs: Date.now(),
      verdictsByPlayer: {
        [playerId("Alice")]: "A_WON",
        [playerId("Bob")]: "A_WON",
        [playerId("Charlie")]: "A_WON",
      },
    },
  });

  await expect(hostPage.getByRole("heading", { name: /^winner winner!$/i })).toBeVisible();
  await expect(hostPage.getByText(/^Alice and Bob win the game!$/i)).toBeVisible();
  await expect(hostPage.locator(".end-game-screen-winner-avatar-wrap")).toHaveCount(2);
  await expect(bobPage.getByRole("button", { name: /return to main menu/i })).toBeVisible();
});
