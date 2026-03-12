import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "wannabe-game";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const [host, portString] = EMULATOR_HOST.split(":");
const port = Number(portString);
const rules = fs.readFileSync("firestore.rules", "utf8");

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host,
    port,
    rules,
  },
});

async function seedRoomData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc("roomCodes/123456").set({
      roomCode: "123456",
      roomId: "room-1",
      status: "inGame",
      expiresAtMs: null,
    });

    await db.doc("rooms/room-1").set({
      roomId: "room-1",
      roomCode: "123456",
      status: "inGame",
      hostPlayerId: "host",
      roundsTotal: 10,
      roundIndex: 0,
      phase: "resolution",
      phaseDeadlineAtMs: null,
      currentPromptId: "WB001",
      activeArgumentSide: null,
      pendingPenaltyPlayerId: null,
      createdAtMs: 1_710_000_000_000,
      expiresAtMs: null,
    });

    await db.doc("rooms/room-1/players/host").set({
      playerId: "host",
      uid: "host",
      displayName: "Host",
      avatarId: null,
      ready: true,
      score: 2,
      joinedAtMs: 1_710_000_000_000,
    });

    await db.doc("rooms/room-1/players/p2").set({
      playerId: "p2",
      uid: "p2",
      displayName: "Blake",
      avatarId: null,
      ready: true,
      score: 1,
      joinedAtMs: 1_710_000_000_100,
    });

    await db.doc("rooms/room-1/rounds/0").set({
      roundIndex: 0,
      promptId: "WB001",
      choicesByPlayer: {
        host: "A",
        p2: "B",
      },
      forceAssignedPlayerIds: [],
      bonusEligiblePlayerId: null,
      verdictsByPlayer: {
        host: "DRAW",
        p2: "DRAW",
      },
      outcome: "DRAW",
      dissenterPlayerId: null,
      penalizedSide: null,
      startedAtMs: 1_710_000_001_000,
      resolvedAtMs: 1_710_000_002_000,
    });
  });
}

async function clearEmulatorData() {
  await testEnv.clearFirestore();
  await seedRoomData();
}

test.after(async () => {
  await testEnv.cleanup();
});

test("member can read room internals", async () => {
  await clearEmulatorData();

  const memberDb = testEnv.authenticatedContext("host").firestore();

  await assertSucceeds(memberDb.doc("rooms/room-1").get());
  await assertSucceeds(memberDb.doc("rooms/room-1/players/p2").get());
  await assertSucceeds(memberDb.doc("rooms/room-1/rounds/0").get());
});

test("non-members and unauthenticated clients cannot read room internals", async () => {
  await clearEmulatorData();

  const nonMemberDb = testEnv.authenticatedContext("outsider").firestore();
  const guestDb = testEnv.unauthenticatedContext().firestore();

  await assertFails(nonMemberDb.doc("rooms/room-1").get());
  await assertFails(nonMemberDb.doc("rooms/room-1/players/host").get());
  await assertFails(nonMemberDb.doc("rooms/room-1/rounds/0").get());
  await assertFails(guestDb.doc("rooms/room-1").get());
  await assertFails(guestDb.doc("rooms/room-1/players/host").get());
});

test("room code documents are never directly readable by clients", async () => {
  await clearEmulatorData();

  const memberDb = testEnv.authenticatedContext("host").firestore();

  await assertFails(memberDb.doc("roomCodes/123456").get());
});

test("clients cannot directly write authoritative room state", async () => {
  await clearEmulatorData();

  const memberDb = testEnv.authenticatedContext("host").firestore();

  await assertFails(
    memberDb.doc("rooms/room-1").set(
      {
        status: "ended",
      },
      { merge: true },
    ),
  );
  await assertFails(
    memberDb.doc("rooms/room-1/players/host").set(
      {
        score: 99,
      },
      { merge: true },
    ),
  );
  await assertFails(
    memberDb.doc("rooms/room-1/rounds/0").set(
      {
        outcome: "A_WON",
      },
      { merge: true },
    ),
  );
});

test("rules test harness is configured", () => {
  assert.ok(testEnv);
});
