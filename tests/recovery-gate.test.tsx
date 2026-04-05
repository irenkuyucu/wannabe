import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { act, fireEvent, render, waitFor } from "@testing-library/react";

import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";
import type { WannabeAppDependencies } from "@/components/wannabe-app";

import { setupReactTestEnv } from "./react-test-env";

setupReactTestEnv();
const require = createRequire(import.meta.url);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function setVisibilityState(nextVisibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: nextVisibilityState,
  });
}

async function dispatchVisibilityChange(nextVisibilityState: DocumentVisibilityState) {
  setVisibilityState(nextVisibilityState);
  await act(async () => {
    document.dispatchEvent(new window.Event("visibilitychange"));
    await Promise.resolve();
  });
}

function createPlayer(overrides: Partial<PlayerDoc>): PlayerDoc {
  return {
    avatarId: "avatar-1",
    displayName: "Player",
    joinedAtMs: 1,
    playerId: "player-1",
    ready: false,
    score: 0,
    uid: "player-1",
    ...overrides,
  };
}

function createRoom(overrides: Partial<RoomDoc>): RoomDoc {
  return {
    activeArgumentSide: null,
    createdAtMs: 1,
    currentPromptId: "WB001",
    expiresAtMs: null,
    hostPlayerId: "player-1",
    hostPromotionNonce: 0,
    lastPromotedHostPlayerId: null,
    phase: "choice",
    phaseDeadlineAtMs: null,
    pendingPenaltyPlayerId: null,
    roomCode: "123456",
    roomId: "room-1",
    roundIndex: 0,
    roundsTotal: 10,
    status: "lobby",
    ...overrides,
  };
}

function createRound(overrides: Partial<RoundDoc>): RoundDoc {
  return {
    autoAssignedPlayerIds: [],
    bonusEligiblePlayerId: null,
    choicesByPlayer: {},
    dissenterPlayerId: null,
    forceAssignedPlayerIds: [],
    outcome: null,
    penalizedPlayerId: null,
    promptId: "WB001",
    resolvedAtMs: null,
    roundIndex: 0,
    startedAtMs: 1,
    verdictsByPlayer: {},
    ...overrides,
  };
}

function buildHeartbeatStub(sequence: Array<Promise<{ ok: true }>>) {
  let callIndex = 0;

  return async () => {
    const next = sequence[callIndex] ?? Promise.resolve({ ok: true } as const);
    callIndex += 1;
    return next;
  };
}

async function loadWannabeAppInner() {
  const localFontPath = require.resolve("next/font/local");
  const previousLocalFontModule = require.cache[localFontPath];
  require.cache[localFontPath] = {
    exports: (options: { variable?: string }) => ({
      className: "",
      style: {},
      variable: options.variable ?? "",
    }),
    filename: localFontPath,
    id: localFontPath,
    loaded: true,
    path: localFontPath,
  } as NodeJS.Module;

  try {
    const componentModule = await import("@/components/wannabe-app");
    return componentModule.WannabeAppInner;
  } finally {
    if (previousLocalFontModule) {
      require.cache[localFontPath] = previousLocalFontModule;
    } else {
      delete require.cache[localFontPath];
    }
  }
}

function createAppDependencies(options?: {
  heartbeatSequence?: Array<Promise<{ ok: true }>>;
  lobbyErrorMessage?: string | null;
  players?: PlayerDoc[];
  room?: RoomDoc;
  round?: RoundDoc | null;
  setReady?: WannabeAppDependencies["setReady"];
  tickRoom?: WannabeAppDependencies["tickRoom"];
  leaveRoom?: WannabeAppDependencies["leaveRoom"];
}) {
  const room = options?.room ?? createRoom({});
  const players = options?.players ?? [createPlayer({})];
  const round = options?.round ?? null;
  const heartbeatRoom =
    buildHeartbeatStub(options?.heartbeatSequence ?? [Promise.resolve({ ok: true })]);

  const deps: Partial<WannabeAppDependencies> = {
    advanceResolution: async () => {
      throw new Error("advanceResolution should not be called in this test.");
    },
    advanceRebuttal: async () => {
      throw new Error("advanceRebuttal should not be called in this test.");
    },
    createRoom: async () => {
      throw new Error("createRoom should not be called in this test.");
    },
    endArgumentTurn: async () => {
      throw new Error("endArgumentTurn should not be called in this test.");
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : "Something went wrong. Please try again.",
    heartbeatRoom,
    isLostRoomMembershipError: (error) =>
      error instanceof Error && /Player is not in this room\./i.test(error.message),
    joinRoom: async () => {
      throw new Error("joinRoom should not be called in this test.");
    },
    leaveRoom: options?.leaveRoom ?? (async () => ({ roomStatus: "lobby" })),
    setReady: options?.setReady ?? (async () => {}),
    startGame: async () => {
      throw new Error("startGame should not be called in this test.");
    },
    submitChoice: async () => {
      throw new Error("submitChoice should not be called in this test.");
    },
    submitVerdict: async () => {
      throw new Error("submitVerdict should not be called in this test.");
    },
    subscribeToAnonymousUser: (onUser) => {
      onUser({ uid: players[0]?.playerId ?? "player-1" } as never);
      return () => {};
    },
    subscribeToLobby: (_roomId, callbacks) => {
      callbacks.onRoom(room);
      callbacks.onPlayers(players);
      if (options?.lobbyErrorMessage) {
        callbacks.onError(options.lobbyErrorMessage);
      }
      return () => {};
    },
    subscribeToRound: (_roomId, _roundIndex, callbacks) => {
      callbacks.onRound(round);
      return () => {};
    },
    tickRoom: options?.tickRoom ?? (async () => ({
      deadlineAtMs: null,
      phase: "choice",
      roundIndex: 0,
    })),
  };

  return deps;
}

async function renderLobbyApp(options?: {
  heartbeatSequence?: Array<Promise<{ ok: true }>>;
  setReady?: WannabeAppDependencies["setReady"];
  leaveRoom?: WannabeAppDependencies["leaveRoom"];
}) {
  const WannabeAppInner = await loadWannabeAppInner();
  const replaceCalls: string[] = [];
  const dependencies = createAppDependencies({
    heartbeatSequence: options?.heartbeatSequence,
    leaveRoom: options?.leaveRoom,
    setReady: options?.setReady,
  });

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialLiveRoomCode="room-1"
      initialShowSplash={false}
      router={{
        replace: (href) => {
          replaceCalls.push(href);
        },
      }}
    />,
  );

  await waitFor(() => {
    view.getByText(/Room 123456 Lobby/i);
  });

  return { replaceCalls, view };
}

test("recovery gate blocks room actions while the foreground heartbeat is pending", async () => {
  setVisibilityState("visible");
  let setReadyCalls = 0;
  const visibleHeartbeat = createDeferred<{ ok: true }>();

  const { view } = await renderLobbyApp({
    heartbeatSequence: [
      Promise.resolve({ ok: true }),
      Promise.resolve({ ok: true }),
      visibleHeartbeat.promise,
    ],
    setReady: async () => {
      setReadyCalls += 1;
    },
  });

  await dispatchVisibilityChange("hidden");
  await dispatchVisibilityChange("visible");

  fireEvent.click(view.getByRole("button", { name: /mark ready/i }));
  assert.equal(setReadyCalls, 0);

  visibleHeartbeat.resolve({ ok: true });
  await act(async () => {
    await visibleHeartbeat.promise;
  });
});

test("successful foreground recovery clears the gate and resumes room actions", async () => {
  setVisibilityState("visible");
  let setReadyCalls = 0;
  const visibleHeartbeat = createDeferred<{ ok: true }>();

  const { view } = await renderLobbyApp({
    heartbeatSequence: [
      Promise.resolve({ ok: true }),
      Promise.resolve({ ok: true }),
      visibleHeartbeat.promise,
    ],
    setReady: async () => {
      setReadyCalls += 1;
    },
  });

  await dispatchVisibilityChange("hidden");
  await dispatchVisibilityChange("visible");

  fireEvent.click(view.getByRole("button", { name: /mark ready/i }));
  assert.equal(setReadyCalls, 0);

  visibleHeartbeat.resolve({ ok: true });
  await act(async () => {
    await visibleHeartbeat.promise;
  });

  fireEvent.click(view.getByRole("button", { name: /mark ready/i }));
  await waitFor(() => {
    assert.equal(setReadyCalls, 1);
  });
});

test("failed foreground recovery with lost membership exits to main with the inactivity message", async () => {
  setVisibilityState("visible");
  const visibleHeartbeat = createDeferred<{ ok: true }>();

  const { replaceCalls, view } = await renderLobbyApp({
    heartbeatSequence: [
      Promise.resolve({ ok: true }),
      Promise.resolve({ ok: true }),
      visibleHeartbeat.promise,
    ],
  });

  await dispatchVisibilityChange("hidden");
  await dispatchVisibilityChange("visible");

  visibleHeartbeat.reject(new Error("Player is not in this room."));
  await act(async () => {
    try {
      await visibleHeartbeat.promise;
    } catch {
      // The component handles the rejected heartbeat internally.
    }
  });

  await waitFor(() => {
    view.getByText(/removed from the room due to inactivity/i);
  });
  assert.equal(replaceCalls.at(-1), "/");
});

test("phase auto-tick is suppressed while foreground recovery is pending", async () => {
  setVisibilityState("visible");
  let tickRoomCalls = 0;
  const visibleHeartbeat = createDeferred<{ ok: true }>();
  const WannabeAppInner = await loadWannabeAppInner();

  const room = createRoom({
    phase: "choice",
    phaseDeadlineAtMs: Date.now() + 150,
    roundIndex: 0,
    status: "inGame",
  });
  const round = createRound({});
  const dependencies = createAppDependencies({
    heartbeatSequence: [
      Promise.resolve({ ok: true }),
      Promise.resolve({ ok: true }),
      visibleHeartbeat.promise,
    ],
    room,
    round,
    tickRoom: async () => {
      tickRoomCalls += 1;
      return {
        deadlineAtMs: null,
        phase: "choice",
        roundIndex: 0,
      };
    },
  });

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialLiveRoomCode="room-1"
      initialShowSplash={false}
      router={{ replace: () => {} }}
    />,
  );

  await waitFor(() => {
    view.getAllByRole("button");
  });

  await dispatchVisibilityChange("hidden");
  await dispatchVisibilityChange("visible");

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 280));
  });
  assert.equal(tickRoomCalls, 0);

  visibleHeartbeat.resolve({ ok: true });
  await act(async () => {
    await visibleHeartbeat.promise;
  });

  await waitFor(() => {
    assert.equal(tickRoomCalls, 1);
  });
});
