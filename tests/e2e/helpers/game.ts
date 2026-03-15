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
  await expect(page.getByText(/^Connecting\.\.\.$/i)).toHaveCount(0);
}

export async function createRoomFromEntry(page: Page, displayName: string) {
  await page.goto("/");
  await waitForEntrySurface(page);
  await page.getByRole("textbox", { name: /display name/i }).fill(displayName);
  await page.getByRole("button", { name: /^create room$/i }).click();

  const roomLabel = page.getByText(/^Room \d{6}$/i).first();
  await expect(roomLabel).toBeVisible();

  const roomCode = (await roomLabel.textContent())?.match(/\d{6}/)?.[0];
  if (!roomCode) {
    throw new Error("Could not determine created room code.");
  }

  return { roomCode };
}

export async function joinRoomFromInvite(page: Page, roomCode: string, displayName: string) {
  await page.goto(`/join/${roomCode}`);
  await waitForEntrySurface(page);
  await page.getByRole("textbox", { name: /display name/i }).fill(displayName);
  await page.getByRole("button", { name: /^join your friends$/i }).click();
  await expect(page.getByText(new RegExp(`^Room ${roomCode}$`, "i")).first()).toBeVisible();
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
    await joinRoomFromInvite(guestPages[index], roomCode, guestNames[index]);
  }

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
