"use client";

import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  collection,
  type Unsubscribe,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { getApps, initializeApp } from "firebase/app";

const FUNCTION_REGION = "europe-west1";

export type RoomDoc = {
  roomId: string;
  roomCode: string;
  status: "lobby" | "inGame" | "ended";
  hostPlayerId: string;
  hostPromotionNonce: number;
  lastPromotedHostPlayerId: string | null;
  roundsTotal: number;
  roundIndex: number | null;
  phase: "choice" | "argument" | "rebuttal" | "verdict" | "resolution" | null;
  phaseDeadlineAtMs: number | null;
  currentPromptId: string | null;
  activeArgumentSide: "A" | "B" | null;
  pendingPenaltyPlayerId: string | null;
  createdAtMs: number;
  expiresAtMs: number | null;
};

export type PlayerDoc = {
  playerId: string;
  uid: string;
  displayName: string;
  avatarId: string | null;
  ready: boolean;
  score: number;
  joinedAtMs: number;
};

export type RoundDoc = {
  roundIndex: number;
  promptId: string;
  choicesByPlayer: Partial<Record<string, "A" | "B">>;
  autoAssignedPlayerIds: string[];
  forceAssignedPlayerIds: string[];
  bonusEligiblePlayerId: string | null;
  verdictsByPlayer: Partial<Record<string, "A_WON" | "B_WON" | "DRAW" | "ABSTAIN">>;
  outcome: "A_WON" | "B_WON" | "DRAW" | null;
  dissenterPlayerId: string | null;
  penalizedPlayerId: string | null;
  startedAtMs: number;
  resolvedAtMs: number | null;
};

type CreateRoomResult = {
  roomId: string;
  roomCode: string;
  playerId: string;
  assignedDisplayName: string;
};

type JoinRoomResult = {
  roomId: string;
  playerId: string;
  assignedDisplayName: string;
};

type StartGameResult = {
  roundIndex: number;
  phase: "choice";
  deadlineAtMs: number;
};

type TickRoomResult = {
  phase: RoomDoc["phase"];
  roundIndex: number;
  deadlineAtMs: number | null;
};

type EndArgumentTurnResult = {
  phase: "argument" | "rebuttal";
  activeArgumentSide?: "A" | "B";
};

type AdvanceRebuttalResult = {
  phase: "verdict";
};

type AdvanceResolutionResult = {
  nextState: RoomDoc["status"];
  roundIndex: number;
};

type FirebaseServices = {
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getFirestore>;
  functions: ReturnType<typeof getFunctions>;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let services: FirebaseServices | null = null;
let emulatorsConnected = false;

function hasUsableFirebaseConfig() {
  return Object.values(firebaseConfig).every(
    (value) => typeof value === "string" && value.length > 0 && !value.startsWith("replace-"),
  );
}

function parseHost(value: string | undefined, fallbackPort: number) {
  if (!value) {
    return null;
  }

  const [host, port] = value.split(":");
  if (!host || !port) {
    return null;
  }

  return {
    host,
    port: Number.parseInt(port, 10) || fallbackPort,
  };
}

function getClientEmulatorHost(
  envValue: string | undefined,
  fallback: { host: string; port: number },
) {
  return parseHost(envValue, fallback.port) ?? fallback;
}

export function getFirebaseServices(): FirebaseServices {
  if (!hasUsableFirebaseConfig()) {
    throw new Error(
      "Firebase web config is missing. Copy .env.example to .env.local and fill in the web app values before using the entry/lobby flow.",
    );
  }

  if (services) {
    return services;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, FUNCTION_REGION);

  if (
    !emulatorsConnected &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
  ) {
    const authHost = getClientEmulatorHost(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
      { host: "127.0.0.1", port: 9099 },
    );
    const firestoreHost = getClientEmulatorHost(
      process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST,
      { host: "127.0.0.1", port: 8080 },
    );
    const functionsHost = getClientEmulatorHost(
      process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST,
      { host: "127.0.0.1", port: 5001 },
    );

    connectAuthEmulator(auth, `http://${authHost.host}:${authHost.port}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, firestoreHost.host, firestoreHost.port);
    connectFunctionsEmulator(functions, functionsHost.host, functionsHost.port);

    emulatorsConnected = true;
  }

  services = { auth, db, functions };
  return services;
}

export function subscribeToAnonymousUser(
  onUser: (user: User | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const { auth } = getFirebaseServices();

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUser(user);
      return;
    }

    try {
      await signInAnonymously(auth);
    } catch (error) {
      onError(getErrorMessage(error));
    }
  });

  return unsubscribe;
}

export async function createRoom(input: {
  displayName: string;
  avatarId: string;
}): Promise<CreateRoomResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<
    { displayName: string; avatarId: string },
    CreateRoomResult
  >(functions, "createRoom");

  const result = await callable(input);
  return result.data;
}

export async function joinRoom(input: {
  roomCode: string;
  displayName: string;
  avatarId: string;
}): Promise<JoinRoomResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<
    { roomCode: string; displayName: string; avatarId: string },
    JoinRoomResult
  >(functions, "joinRoom");

  const result = await callable(input);
  return result.data;
}

export async function setReady(input: {
  roomId: string;
  ready: boolean;
}) {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string; ready: boolean }, { ready: boolean }>(
    functions,
    "setReady",
  );
  await callable(input);
}

export async function startGame(input: { roomId: string }): Promise<StartGameResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, StartGameResult>(
    functions,
    "startGame",
  );
  const result = await callable(input);
  return result.data;
}

export async function leaveRoom(input: { roomId: string }) {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, { roomStatus: string }>(
    functions,
    "leaveRoom",
  );
  const result = await callable(input);
  return result.data;
}

export function subscribeToLobby(
  roomId: string,
  callbacks: {
    onRoom: (room: RoomDoc | null) => void;
    onPlayers: (players: PlayerDoc[]) => void;
    onError: (message: string) => void;
  },
): Unsubscribe {
  const { db } = getFirebaseServices();

  const unsubRoom = onSnapshot(
    doc(db, "rooms", roomId),
    (snapshot) => {
      callbacks.onRoom(snapshot.exists() ? (snapshot.data() as RoomDoc) : null);
    },
    (error) => callbacks.onError(getErrorMessage(error)),
  );

  const unsubPlayers = onSnapshot(
    query(collection(db, "rooms", roomId, "players"), orderBy("joinedAtMs", "asc")),
    (snapshot) => {
      callbacks.onPlayers(
        snapshot.docs.map((playerDoc) => playerDoc.data() as PlayerDoc),
      );
    },
    (error) => callbacks.onError(getErrorMessage(error)),
  );

  return () => {
    unsubRoom();
    unsubPlayers();
  };
}

export function subscribeToRound(
  roomId: string,
  roundIndex: number,
  callbacks: {
    onRound: (round: RoundDoc | null) => void;
    onError: (message: string) => void;
  },
): Unsubscribe {
  const { db } = getFirebaseServices();

  return onSnapshot(
    doc(db, "rooms", roomId, "rounds", String(roundIndex)),
    (snapshot) => {
      callbacks.onRound(snapshot.exists() ? (snapshot.data() as RoundDoc) : null);
    },
    (error) => callbacks.onError(getErrorMessage(error)),
  );
}

export async function tickRoom(input: { roomId: string }): Promise<TickRoomResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, TickRoomResult>(functions, "tickRoom");
  const result = await callable(input);
  return result.data;
}

export async function submitChoice(input: {
  roomId: string;
  side: "A" | "B";
}): Promise<{ locked: true }> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string; side: "A" | "B" }, { locked: true }>(
    functions,
    "submitChoice",
  );
  const result = await callable(input);
  return result.data;
}

export async function endArgumentTurn(input: {
  roomId: string;
}): Promise<EndArgumentTurnResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, EndArgumentTurnResult>(
    functions,
    "endArgumentTurn",
  );
  const result = await callable(input);
  return result.data;
}

export async function advanceRebuttal(input: {
  roomId: string;
}): Promise<AdvanceRebuttalResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, AdvanceRebuttalResult>(
    functions,
    "advanceRebuttal",
  );
  const result = await callable(input);
  return result.data;
}

export async function submitVerdict(input: {
  roomId: string;
  verdict: "A_WON" | "B_WON" | "DRAW";
}): Promise<{ locked: true }> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<
    { roomId: string; verdict: "A_WON" | "B_WON" | "DRAW" },
    { locked: true }
  >(functions, "submitVerdict");
  const result = await callable(input);
  return result.data;
}

export async function advanceResolution(input: {
  roomId: string;
}): Promise<AdvanceResolutionResult> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ roomId: string }, AdvanceResolutionResult>(
    functions,
    "advanceResolution",
  );
  const result = await callable(input);
  return result.data;
}

export function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}
