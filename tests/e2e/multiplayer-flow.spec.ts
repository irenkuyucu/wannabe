import { expect, test } from "@playwright/test";

import { cleanupFirestoreTestEnv, clearFirestore } from "./helpers/firebase";
import {
  createLobbyActors,
  holdToConfirm,
  lookupRoom,
  seedRoomPhase,
  setRoomRoundsTotal,
  waitForEntrySurface,
} from "./helpers/game";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearFirestore();
});

test.afterAll(async () => {
  await cleanupFirestoreTestEnv();
});

test("players can progress through a one-round session and the host ends the room from the end-game screen", async ({
  browser,
}) => {
  test.setTimeout(60_000);

  const {
    guestNames: [guestName],
    guestPages: [guestPage],
    hostName,
    hostPage,
    roomCode,
  } = await createLobbyActors(browser, ["Alice", "Bob"]);

  await expect
    .poll(async () => (await lookupRoom(roomCode)).players.length, {
      timeout: 5000,
    })
    .toBe(2);
  const room = await lookupRoom(roomCode);
  const playersByName = new Map(room.players.map((player) => [player.displayName, player]));

  function playerId(displayName: string) {
    const player = playersByName.get(displayName);
    if (!player) {
      throw new Error(`Missing player ${displayName}.`);
    }
    return player.playerId;
  }

  await setRoomRoundsTotal(roomCode, 1);

  await hostPage.getByRole("button", { name: /mark ready/i }).click();
  await guestPage.getByRole("button", { name: /mark ready/i }).click();
  await hostPage.getByRole("button", { name: /^start game$/i }).click();

  await expect(hostPage.getByText(/^Round 1 \/ 1$/i)).toBeVisible({ timeout: 10000 });
  await expect(hostPage.getByText(/^Choice$/i)).toBeVisible({ timeout: 10000 });
  await expect(guestPage.getByText(/^Choice$/i)).toBeVisible({ timeout: 10000 });

  const hostChoiceOptions = hostPage.locator(".choice-option");
  const guestChoiceOptions = guestPage.locator(".choice-option");
  await hostChoiceOptions.nth(0).click();
  await expect(hostChoiceOptions.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(hostChoiceOptions.nth(0)).toBeDisabled();
  await guestChoiceOptions.nth(1).click();

  await expect(hostPage.getByText(/^Side A is speaking$/i)).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByText(/^Side A is speaking$/i)).toBeVisible({ timeout: 15000 });
  await expect(hostPage.getByRole("button", { name: /hold to end turn/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(guestPage.getByRole("button", { name: /hold to end turn/i })).toHaveCount(0);

  await holdToConfirm(hostPage, hostPage.getByRole("button", { name: /hold to end turn/i }));

  await expect(hostPage.getByText(/^Side B is speaking$/i)).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByText(/^Side B is speaking$/i)).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByRole("button", { name: /hold to end turn/i })).toBeVisible({
    timeout: 15000,
  });

  await holdToConfirm(guestPage, guestPage.getByRole("button", { name: /hold to end turn/i }));

  await expect(hostPage.getByText(/floor is open/i)).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByText(/host can advance the game/i)).toBeVisible({
    timeout: 15000,
  });

  await seedRoomPhase({
    roomCode,
    roundIndex: 0,
    roundsTotal: 1,
    hostName,
    playersByName: [
      { displayName: hostName, ready: true, score: 0 },
      { displayName: guestName, ready: true, score: 0 },
    ],
    roomPatch: {
      activeArgumentSide: null,
      phase: "verdict",
      phaseDeadlineAtMs: Date.now() + 45_000,
    },
    roundPatch: {
      choicesByPlayer: {
        [playerId(hostName)]: "A",
        [playerId(guestName)]: "B",
      },
    },
  });

  await expect(hostPage.getByText(/^Verdict$/i)).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByText(/^Verdict$/i)).toBeVisible({ timeout: 15000 });

  const hostVerdictOptions = hostPage.locator(".verdict-option");
  await hostVerdictOptions.nth(0).click();
  await expect(hostVerdictOptions.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(hostVerdictOptions.nth(0)).toBeDisabled();
  await expect(hostVerdictOptions.nth(0).getByText(/^1 vote$/i)).toBeVisible();

  const guestVerdictOptions = guestPage.locator(".verdict-option");
  await guestVerdictOptions.nth(0).click();

  await expect(hostPage.getByRole("heading", { name: /^winner winner!$/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(guestPage.getByRole("heading", { name: /^winner winner!$/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(hostPage.getByText(/^Alice wins the game!$/i)).toBeVisible();
  await expect(guestPage.getByText(/^Alice wins the game!$/i)).toBeVisible();
  await expect(hostPage.getByRole("button", { name: /return to main menu/i })).toBeVisible();
  await expect(guestPage.getByRole("button", { name: /return to main menu/i })).toBeVisible();

  await guestPage.getByRole("button", { name: /return to main menu/i }).click();
  await waitForEntrySurface(guestPage);
  await expect(guestPage.getByText(/^Be someone!$/i)).toBeVisible();

  await hostPage.getByRole("button", { name: /return to main menu/i }).click();
  await waitForEntrySurface(hostPage);
  await expect(hostPage.getByText(/^Be someone!$/i)).toBeVisible();

  await hostPage.getByRole("textbox", { name: /display name/i }).fill(hostName);
  await hostPage.getByRole("textbox", { name: /room code/i }).fill(roomCode);
  await hostPage.getByRole("button", { name: /^join room$/i }).click();

  await expect(hostPage.locator(".toast.toast-error")).toContainText(
    /room is not joinable/i,
  );
  await expect(guestPage.getByRole("textbox", { name: /display name/i })).toBeVisible();
});
