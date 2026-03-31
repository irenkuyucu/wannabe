import { expect, test } from "@playwright/test";

import { cleanupFirestoreTestEnv, clearFirestore } from "./helpers/firebase";
import { createRoomFromEntry, lookupRoom, seedRoomPhase } from "./helpers/game";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearFirestore();
});

test.afterAll(async () => {
  await cleanupFirestoreTestEnv();
});

test("unsupported in-game phases render the centered sync fallback ghost surface", async ({
  page,
}) => {
  const { roomCode } = await createRoomFromEntry(page, "Alice");

  const room = await lookupRoom(roomCode);
  const hostPlayer = room.players.find((player) => player.displayName === "Alice");

  if (!hostPlayer) {
    throw new Error("Expected seeded host player.");
  }

  await seedRoomPhase({
    roomCode,
    roundIndex: 0,
    roundsTotal: 10,
    hostName: "Alice",
    playersByName: [
      { displayName: "Alice", ready: true, score: 0 },
    ],
    roomPatch: {
      activeArgumentSide: null,
      phase: "sync",
      phaseDeadlineAtMs: Date.now() + 45_000,
    },
    roundPatch: {
      choicesByPlayer: {
        [hostPlayer.playerId]: "A",
      },
    },
  });

  await expect(page.getByLabel(/loading game phase/i)).toBeVisible();
  await expect(page.locator(".game-sync-progress.skeleton-ghost")).toBeVisible();
  await expect(page.locator(".game-sync-card.skeleton-ghost")).toBeVisible();
  await expect(page.locator(".game-sync-button.skeleton-ghost")).toBeVisible();

  const shellMetrics = await page.locator(".game-screen-shell").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      left: rect.left,
      viewportWidth: window.innerWidth,
    };
  });

  expect(shellMetrics.left).toBeGreaterThan(20);
  expect(Math.abs(shellMetrics.centerX - shellMetrics.viewportWidth / 2)).toBeLessThanOrEqual(6);
});
