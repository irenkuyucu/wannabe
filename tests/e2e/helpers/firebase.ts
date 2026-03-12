import fs from "node:fs";

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  process.env.GCLOUD_PROJECT ??
  "wannabe-game";
const EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ??
  process.env.FIRESTORE_EMULATOR_HOST ??
  "127.0.0.1:8080";
const [host, portString] = EMULATOR_HOST.split(":");
const port = Number.parseInt(portString ?? "8080", 10);
const rules = fs.readFileSync("firestore.rules", "utf8");

let testEnvPromise: Promise<RulesTestEnvironment> | null = null;

type FirestoreDocSnapshot<T> = {
  data(): T | undefined;
};

type FirestoreQuerySnapshot<T> = {
  docs: Array<{
    data(): T;
  }>;
};

export type FirestoreLike = {
  collection<T = Record<string, unknown>>(path: string): {
    get(): Promise<FirestoreQuerySnapshot<T>>;
  };
  doc<T = Record<string, unknown>>(path: string): {
    get(): Promise<FirestoreDocSnapshot<T>>;
    set(data: Partial<T> | T, options?: { merge?: boolean }): Promise<void>;
  };
};

async function getTestEnv() {
  if (!testEnvPromise) {
    testEnvPromise = initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules,
      },
    });
  }

  return testEnvPromise;
}

export async function clearFirestore() {
  const testEnv = await getTestEnv();
  await testEnv.clearFirestore();
}

export async function cleanupFirestoreTestEnv() {
  if (!testEnvPromise) {
    return;
  }

  const testEnv = await testEnvPromise;
  await testEnv.cleanup();
  testEnvPromise = null;
}

export async function withAdminFirestore<T>(callback: (db: FirestoreLike) => Promise<T>) {
  const testEnv = await getTestEnv();
  let result!: T;

  await testEnv.withSecurityRulesDisabled(async (context) => {
    result = await callback(context.firestore() as unknown as FirestoreLike);
  });

  return result;
}
