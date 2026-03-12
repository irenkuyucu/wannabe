import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

import {
  cleanupFirestoreTestEnv,
  clearFirestore,
  type FirestoreLike,
  withAdminFirestore,
} from "./helpers/firebase";

type RoomPlayer = {
  playerId: string;
  displayName: string;
  avatarId: string | null;
  joinedAtMs: number;
};

type LobbyActors = {
  guestName: string;
  guestPage: Page;
  hostName: string;
  hostPage: Page;
  roomCode: string;
};

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearFirestore();
});

test.afterAll(async () => {
  await cleanupFirestoreTestEnv();
});

async function createLobbyActors(browser: Browser): Promise<LobbyActors> {
  const hostPage = await browser.newPage();
  const guestPage = await browser.newPage();
  const hostName = "Host Alpha";
  const guestName = "Guest Bravo";

  await hostPage.goto("/");
  await hostPage.getByRole("textbox", { name: /display name/i }).fill(hostName);
  await hostPage.getByRole("button", { name: /^create room$/i }).last().click();

  const roomLabel = hostPage.getByText(/^Room \d{6}$/i).first();
  await expect(roomLabel).toBeVisible();

  const roomCode = (await roomLabel.textContent())?.match(/\d{6}/)?.[0];
  if (!roomCode) {
    throw new Error("Could not determine created room code.");
  }

  await guestPage.goto(`/?room=${roomCode}`);
  await guestPage.getByRole("textbox", { name: /display name/i }).fill(guestName);
  await guestPage.getByRole("button", { name: /^join room$/i }).last().click();

  await expect(guestPage.getByText(new RegExp(`^Room ${roomCode}$`, "i")).first()).toBeVisible();

  return { guestName, guestPage, hostName, hostPage, roomCode };
}

async function lookupRoom(roomCode: string) {
  return withAdminFirestore(async (db) => {
    const roomCodeSnap = await db.doc(`roomCodes/${roomCode}`).get();
    const roomCodeData = roomCodeSnap.data();

    if (!roomCodeData?.roomId) {
      throw new Error(`Room code ${roomCode} was not found in the emulator.`);
    }

    const roomId = roomCodeData.roomId as string;
    const playersSnapshot = await db.collection<RoomPlayer>(`rooms/${roomId}/players`).get();
    const players = playersSnapshot.docs.map((playerDoc) => playerDoc.data());

    return { players, roomId };
  });
}

async function seedResolutionState(input: {
  guestName: string;
  guestScore: number;
  hostName: string;
  hostScore: number;
  outcome: "A_WON" | "B_WON" | "DRAW";
  roomCode: string;
  roundIndex: number;
  roundsTotal: number;
}) {
  const { players, roomId } = await lookupRoom(input.roomCode);
  const hostPlayer = players.find((player: RoomPlayer) => player.displayName === input.hostName);
  const guestPlayer = players.find((player: RoomPlayer) => player.displayName === input.guestName);

  if (!hostPlayer || !guestPlayer) {
    throw new Error("Could not map seeded lobby players to emulator records.");
  }

  const promptId = input.roundIndex % 2 === 0 ? "WB001" : "WB002";

  await withAdminFirestore(async (db: FirestoreLike) => {
    await db.doc(`roomCodes/${input.roomCode}`).set(
      {
        expiresAtMs: null,
        status: "inGame",
      },
      { merge: true },
    );

    await db.doc(`rooms/${roomId}`).set(
      {
        activeArgumentSide: null,
        currentPromptId: promptId,
        expiresAtMs: null,
        hostPlayerId: hostPlayer.playerId,
        pendingPenaltyPlayerId: null,
        phase: "resolution",
        phaseDeadlineAtMs: null,
        roundIndex: input.roundIndex,
        roundsTotal: input.roundsTotal,
        status: "inGame",
      },
      { merge: true },
    );

    await db.doc(`rooms/${roomId}/players/${hostPlayer.playerId}`).set(
      {
        ready: true,
        score: input.hostScore,
      },
      { merge: true },
    );
    await db.doc(`rooms/${roomId}/players/${guestPlayer.playerId}`).set(
      {
        ready: true,
        score: input.guestScore,
      },
      { merge: true },
    );

    await db.doc(`rooms/${roomId}/rounds/${input.roundIndex}`).set({
      bonusEligiblePlayerId: null,
      choicesByPlayer: {
        [guestPlayer.playerId]: "B",
        [hostPlayer.playerId]: "A",
      },
      dissenterPlayerId: null,
      forceAssignedPlayerIds: [],
      outcome: input.outcome,
      penalizedSide: null,
      promptId,
      resolvedAtMs: 1_710_000_002_000 + input.roundIndex,
      roundIndex: input.roundIndex,
      startedAtMs: 1_710_000_001_000 + input.roundIndex,
      verdictsByPlayer: {
        [guestPlayer.playerId]: input.outcome,
        [hostPlayer.playerId]: input.outcome,
      },
    });
  });
}

async function holdToConfirm(page: Page, button: Locator) {
  await button.dispatchEvent("pointerdown", {
    button: 0,
    isPrimary: true,
    pointerType: "mouse",
  });
  await page.waitForTimeout(2200);
  await page.locator("body").dispatchEvent("pointerup", {
    button: 0,
    isPrimary: true,
    pointerType: "mouse",
  });
}

test("host can advance a non-final resolution round while non-host only sees the waiting state", async ({
  browser,
}) => {
  const { guestName, guestPage, hostName, hostPage, roomCode } = await createLobbyActors(browser);

  await seedResolutionState({
    guestName,
    guestScore: 1,
    hostName,
    hostScore: 2,
    outcome: "A_WON",
    roomCode,
    roundIndex: 0,
    roundsTotal: 2,
  });

  await expect(hostPage.getByText(/^Round result$/i)).toBeVisible();
  await expect(hostPage.getByText(/^Side A won$/i)).toBeVisible();
  await expect(
    hostPage.getByRole("button", { name: /host hold 2s for next round/i }),
  ).toBeVisible();

  await expect(
    guestPage.getByText(/waiting for the host to advance to the next round\./i),
  ).toBeVisible();
  await expect(
    guestPage.getByRole("button", { name: /host hold 2s for next round/i }),
  ).toHaveCount(0);

  const hostAdvanceButton = hostPage.getByRole("button", {
    name: /host hold 2s for next round/i,
  });
  await holdToConfirm(hostPage, hostAdvanceButton);

  await expect(hostPage.getByText(/lock your side before the timer runs out\./i)).toBeVisible();
  await expect(guestPage.getByText(/lock your side before the timer runs out\./i)).toBeVisible();
});

test("final-round resolution clearly marks game over and host action opens the ended-room screen", async ({
  browser,
}) => {
  const { guestName, guestPage, hostName, hostPage, roomCode } = await createLobbyActors(browser);

  await seedResolutionState({
    guestName,
    guestScore: 3,
    hostName,
    hostScore: 5,
    outcome: "A_WON",
    roomCode,
    roundIndex: 0,
    roundsTotal: 1,
  });

  await expect(hostPage.getByText(/^Final round$/i)).toBeVisible();
  await expect(hostPage.getByText(/^Side A won$/i)).toBeVisible();
  await expect(
    hostPage.getByRole("button", { name: /host hold 2s for game over/i }),
  ).toBeVisible();
  await expect(
    guestPage.getByText(/waiting for the host to open game over\./i),
  ).toBeVisible();

  const hostGameOverButton = hostPage.getByRole("button", {
    name: /host hold 2s for game over/i,
  });
  await holdToConfirm(hostPage, hostGameOverButton);

  await expect(hostPage.getByText(/^Game over$/i)).toBeVisible();
  await expect(guestPage.getByText(/^Game over$/i)).toBeVisible();
  await expect(hostPage.getByText(/wins the session\./i)).toBeVisible();
  await expect(hostPage.getByText(/the room stays readable for a short window but cannot be rejoined\./i)).toBeVisible();
});

test("return to main exits the ended room and the old room code cannot be rejoined", async ({
  browser,
}) => {
  const { guestName, guestPage, hostName, hostPage, roomCode } = await createLobbyActors(browser);

  await seedResolutionState({
    guestName,
    guestScore: 2,
    hostName,
    hostScore: 4,
    outcome: "A_WON",
    roomCode,
    roundIndex: 0,
    roundsTotal: 1,
  });

  const hostGameOverButton = hostPage.getByRole("button", {
    name: /host hold 2s for game over/i,
  });
  await expect(hostPage.getByText(/^Side A won$/i)).toBeVisible();
  await expect(hostGameOverButton).toBeVisible();
  await holdToConfirm(hostPage, hostGameOverButton);

  await expect(hostPage.getByRole("button", { name: /return to main/i })).toBeVisible();
  await guestPage.close();

  await hostPage.getByRole("button", { name: /return to main/i }).click();
  await expect(
    hostPage.getByRole("heading", {
      name: /launch the room\. then play the full session in real time\./i,
    }),
  ).toBeVisible();

  await hostPage.getByRole("button", { name: /^join room$/i }).first().click();
  await hostPage.getByRole("textbox", { name: /room code/i }).fill(roomCode);
  await hostPage.getByRole("button", { name: /^join room$/i }).last().click();

  await expect(hostPage.getByText(/room is not joinable\./i)).toBeVisible();
});
