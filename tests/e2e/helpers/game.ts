import { expect, type Browser, type Locator, type Page } from "@playwright/test";

import { withAdminFirestore, type FirestoreLike } from "./firebase";

export type RoomPlayer = {
  playerId: string;
  displayName: string;
  avatarId: string | null;
  joinedAtMs: number;
};

export type RoomLookup = {
  players: RoomPlayer[];
  roomId: string;
};

export async function waitForEntrySurface(page: Page) {
  await expect(page.getByRole("textbox", { name: /display name/i })).toBeVisible({
    timeout: 7000,
  });
}

async function waitForEntryActionReady(
  page: Page,
  actionName: RegExp,
) {
  const actionButton = page.getByRole("button", { name: actionName });
  await expect(actionButton).toBeVisible({ timeout: 7000 });
  await expect(actionButton).toBeEnabled({ timeout: 7000 });
}

export async function waitForLobbyReady(
  page: Page,
  roomCode: string,
  expectedPlayers: string[],
) {
  await expect(page.getByText(new RegExp(`^Room ${roomCode} Lobby$`, "i")).first()).toBeVisible({
    timeout: 15_000,
  });

  for (const displayName of expectedPlayers) {
    await expect(page.getByText(new RegExp(`^${displayName}(?: \\(Host\\))?$`, "i"))).toBeVisible({
      timeout: 15_000,
    });
  }

  await expect(page.getByRole("button", { name: /mark ready/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /mark ready/i })).toBeEnabled({
    timeout: 15_000,
  });
}

async function waitForLobbyReadyWithRecovery(
  page: Page,
  roomCode: string,
  expectedPlayers: string[],
) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await waitForLobbyReady(page, roomCode, expectedPlayers);
      return;
    } catch (error) {
      lastError = error;

      if (attempt === 1) {
        break;
      }

      await page.reload();
    }
  }

  throw lastError;
}

export async function clickReadyButton(page: Page) {
  const readyButton = page.getByRole("button", { name: /mark ready/i });
  await expect(readyButton).toBeVisible({ timeout: 15_000 });
  await expect(readyButton).toBeEnabled({ timeout: 15_000 });
  await readyButton.click({ force: true });
}

export async function createRoomFromEntry(page: Page, displayName: string) {
  await page.goto("/");
  await waitForEntrySurface(page);
  await waitForEntryActionReady(page, /^create room$/i);
  await page.getByRole("textbox", { name: /display name/i }).fill(displayName);
  await page.getByRole("button", { name: /^create room$/i }).click();

  const roomLabel = page.getByText(/^Room \d{6} Lobby$/i).first();
  await expect(roomLabel).toBeVisible();

  const roomCode = (await roomLabel.textContent())?.match(/\d{6}/)?.[0];
  if (!roomCode) {
    throw new Error("Could not determine created room code.");
  }

  await waitForLobbyReadyWithRecovery(page, roomCode, [displayName]);

  return { roomCode };
}

export async function joinRoomFromInvite(page: Page, roomCode: string, displayName: string) {
  await page.goto(`/?join=${roomCode}`);
  await waitForEntrySurface(page);
  await waitForEntryActionReady(page, /^join your friends$/i);
  await page.getByRole("textbox", { name: /display name/i }).fill(displayName);
  await page.getByRole("button", { name: /^join your friends$/i }).click();
  await page.waitForURL(new RegExp(`[?&]live=${roomCode}\\b`), {
    timeout: 30_000,
  });

  try {
    await waitForLobbyReadyWithRecovery(page, roomCode, [displayName]);
    return page;
  } catch (error) {
    const recoveredPage = await page.context().newPage();
    await recoveredPage.goto(`/?live=${roomCode}`);
    await waitForLobbyReadyWithRecovery(recoveredPage, roomCode, [displayName]);
    await page.close();
    return recoveredPage;
  }
}

export async function createLobbyActors(browser: Browser, names: string[]) {
  if (names.length < 2) {
    throw new Error("createLobbyActors requires at least two player names.");
  }

  const contexts = await Promise.all(names.map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [hostPage, ...guestPages] = pages;
  const [hostName, ...guestNames] = names;
  const { roomCode } = await createRoomFromEntry(hostPage, hostName);

  for (let index = 0; index < guestPages.length; index += 1) {
    guestPages[index] = await joinRoomFromInvite(guestPages[index], roomCode, guestNames[index]);
  }

  await expect
    .poll(async () => (await lookupRoom(roomCode)).players.length, {
      timeout: 30_000,
    })
    .toBe(names.length);
  await waitForLobbyReadyWithRecovery(hostPage, roomCode, names);

  return {
    guestNames,
    guestPages,
    hostName,
    hostPage,
    contexts,
    pages,
    roomCode,
  };
}

export async function lookupRoom(roomCode: string): Promise<RoomLookup> {
  return withAdminFirestore(async (db) => {
    const roomSnapshot = await db.doc(`rooms/${roomCode}`).get();
    if (!roomSnapshot.data()) {
      throw new Error(`Room ${roomCode} was not found in the emulator.`);
    }

    const roomId = roomCode;
    const playersSnapshot = await db.collection<RoomPlayer>(`rooms/${roomId}/players`).get();
    const players = playersSnapshot.docs.map((playerDoc) => playerDoc.data());

    return { players, roomId };
  });
}

export async function setRoomRoundsTotal(roomCode: string, roundsTotal: number) {
  const { roomId } = await lookupRoom(roomCode);

  await withAdminFirestore(async (db: FirestoreLike) => {
    await db.doc(`rooms/${roomId}`).set({ roundsTotal }, { merge: true });
  });
}

type SeedRoomPhaseInput = {
  roomCode: string;
  roundIndex: number;
  roundsTotal: number;
  hostName: string;
  playersByName?: Array<{ displayName: string; ready?: boolean; score?: number }>;
  roomPatch?: Record<string, unknown>;
  roundPatch?: Record<string, unknown>;
};

export async function seedRoomPhase(input: SeedRoomPhaseInput) {
  const { players, roomId } = await lookupRoom(input.roomCode);
  const playersByName = new Map(players.map((player) => [player.displayName, player]));
  const hostPlayer = playersByName.get(input.hostName);

  if (!hostPlayer) {
    throw new Error(`Could not find host player ${input.hostName}.`);
  }

  const promptId = input.roundIndex % 2 === 0 ? "WB001" : "WB002";
  const startedAtMs = 1_710_000_001_000 + input.roundIndex;

  await withAdminFirestore(async (db: FirestoreLike) => {
    await db.doc(`rooms/${roomId}`).set(
      {
        activeArgumentSide: null,
        currentPromptId: promptId,
        expiresAtMs: null,
        hostPlayerId: hostPlayer.playerId,
        pendingPenaltyPlayerId: null,
        phase: "choice",
        phaseDeadlineAtMs: Date.now() + 45_000,
        roundIndex: input.roundIndex,
        roundsTotal: input.roundsTotal,
        status: "inGame",
        ...input.roomPatch,
      },
      { merge: true },
    );

    for (const playerPatch of input.playersByName ?? []) {
      const player = playersByName.get(playerPatch.displayName);
      if (!player) {
        throw new Error(`Could not find player ${playerPatch.displayName}.`);
      }

      await db.doc(`rooms/${roomId}/players/${player.playerId}`).set(
        {
          ready: playerPatch.ready ?? true,
          score: playerPatch.score ?? 0,
        },
        { merge: true },
      );
    }

    await db.doc(`rooms/${roomId}/rounds/${input.roundIndex}`).set({
      autoAssignedPlayerIds: [],
      bonusEligiblePlayerId: null,
      choicesByPlayer: {},
      dissenterPlayerId: null,
      forceAssignedPlayerIds: [],
      outcome: null,
      penalizedPlayerId: null,
      promptId,
      resolvedAtMs: null,
      roundIndex: input.roundIndex,
      startedAtMs,
      verdictsByPlayer: {},
      ...input.roundPatch,
    });
  });

  return {
    hostPlayer,
    playersByName,
    roomId,
  };
}

export async function holdToConfirm(page: Page, button: Locator) {
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
