import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { act, render, waitFor } from "@testing-library/react";

import type { PlayerDoc, RoomDoc } from "@/lib/firebase-client";
import type { WannabeAppDependencies } from "@/components/wannabe-app";

import { setupReactTestEnv } from "./react-test-env";

setupReactTestEnv();
const require = createRequire(import.meta.url);

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
    currentPromptId: null,
    expiresAtMs: null,
    hostPlayerId: "host-1",
    hostPromotionNonce: 0,
    lastPromotedHostPlayerId: null,
    phase: null,
    phaseDeadlineAtMs: null,
    pendingPenaltyPlayerId: null,
    roomCode: "123456",
    roomId: "123456",
    roundIndex: null,
    roundsTotal: 10,
    status: "lobby",
    ...overrides,
  };
}

test("live-room hydration retries after an initial membership permission error", async () => {
  const WannabeAppInner = await loadWannabeAppInner();
  const guestPlayer = createPlayer({
    displayName: "Bob",
    joinedAtMs: 2,
    playerId: "guest-1",
    uid: "guest-1",
  });
  const hostPlayer = createPlayer({
    displayName: "Alice",
    playerId: "host-1",
    uid: "host-1",
  });
  const room = createRoom({});
  let lobbySubscribeCalls = 0;

  const dependencies: Partial<WannabeAppDependencies> = {
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
    heartbeatRoom: async () => ({ ok: true }),
    isLostRoomMembershipError: () => false,
    joinRoom: async () => {
      throw new Error("joinRoom should not be called in this test.");
    },
    leaveRoom: async () => ({ roomStatus: "lobby" }),
    setReady: async () => {},
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
      onUser({ uid: guestPlayer.playerId } as never);
      return () => {};
    },
    subscribeToLobby: (_roomId, callbacks) => {
      lobbySubscribeCalls += 1;

      if (lobbySubscribeCalls === 1) {
        callbacks.onError("Missing or insufficient permissions.");
        return () => {};
      }

      callbacks.onRoom(room);
      callbacks.onPlayers([hostPlayer, guestPlayer]);
      return () => {};
    },
    subscribeToRound: () => () => {},
    tickRoom: async () => ({
      deadlineAtMs: null,
      phase: "choice",
      roundIndex: 0,
    }),
  };

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialLiveRoomCode="123456"
      initialShowSplash={false}
      router={{ replace: () => {} }}
    />,
  );

  await waitFor(() => {
    view.getByText(/Room 123456 Lobby/i);
    view.getByText(/^Bob$/i);
  });

  assert.equal(lobbySubscribeCalls >= 2, true);
  assert.equal(view.getByRole("button", { name: /mark ready/i }).hasAttribute("disabled"), false);
});

test("live-room hydration retries when the room loads before the joined player appears", async () => {
  const WannabeAppInner = await loadWannabeAppInner();
  const guestPlayer = createPlayer({
    displayName: "Bob",
    joinedAtMs: 2,
    playerId: "guest-1",
    uid: "guest-1",
  });
  const hostPlayer = createPlayer({
    displayName: "Alice",
    playerId: "host-1",
    uid: "host-1",
  });
  const room = createRoom({});
  let lobbySubscribeCalls = 0;

  const dependencies: Partial<WannabeAppDependencies> = {
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
    heartbeatRoom: async () => ({ ok: true }),
    isLostRoomMembershipError: () => false,
    joinRoom: async () => {
      throw new Error("joinRoom should not be called in this test.");
    },
    leaveRoom: async () => ({ roomStatus: "lobby" }),
    setReady: async () => {},
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
      onUser({ uid: guestPlayer.playerId } as never);
      return () => {};
    },
    subscribeToLobby: (_roomId, callbacks) => {
      lobbySubscribeCalls += 1;

      callbacks.onRoom(room);
      if (lobbySubscribeCalls === 1) {
        callbacks.onPlayers([hostPlayer]);
        return () => {};
      }

      callbacks.onPlayers([hostPlayer, guestPlayer]);
      return () => {};
    },
    subscribeToRound: () => () => {},
    tickRoom: async () => ({
      deadlineAtMs: null,
      phase: "choice",
      roundIndex: 0,
    }),
  };

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialLiveRoomCode="123456"
      initialShowSplash={false}
      router={{ replace: () => {} }}
    />,
  );

  await waitFor(() => {
    view.getByText(/Room 123456 Lobby/i);
    view.getByText(/^Bob$/i);
  });

  assert.equal(lobbySubscribeCalls >= 2, true);
  assert.equal(view.getByRole("button", { name: /mark ready/i }).hasAttribute("disabled"), false);
});

test("live-room hydration updates the player list without resubscribing the lobby listener", async () => {
  const WannabeAppInner = await loadWannabeAppInner();
  const hostPlayer = createPlayer({
    displayName: "Alice",
    playerId: "host-1",
    uid: "host-1",
  });
  const guestPlayer = createPlayer({
    displayName: "Bob",
    joinedAtMs: 2,
    playerId: "guest-1",
    uid: "guest-1",
  });
  const room = createRoom({});
  let lobbySubscribeCalls = 0;
  let emitPlayers: ((players: PlayerDoc[]) => void) | null = null;

  const dependencies: Partial<WannabeAppDependencies> = {
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
    heartbeatRoom: async () => ({ ok: true }),
    isLostRoomMembershipError: () => false,
    joinRoom: async () => {
      throw new Error("joinRoom should not be called in this test.");
    },
    leaveRoom: async () => ({ roomStatus: "lobby" }),
    setReady: async () => {},
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
      onUser({ uid: hostPlayer.uid } as never);
      return () => {};
    },
    subscribeToLobby: (_roomId, callbacks) => {
      lobbySubscribeCalls += 1;
      emitPlayers = callbacks.onPlayers;
      callbacks.onRoom(room);
      callbacks.onPlayers([hostPlayer]);
      return () => {};
    },
    subscribeToRound: () => () => {},
    tickRoom: async () => ({
      deadlineAtMs: null,
      phase: "choice",
      roundIndex: 0,
    }),
  };

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialLiveRoomCode="123456"
      initialShowSplash={false}
      router={{ replace: () => {} }}
    />,
  );

  await waitFor(() => {
    view.getByText(/Room 123456 Lobby/i);
    view.getByText(/Alice \(Host\)/i);
  });

  assert.equal(lobbySubscribeCalls, 1);
  assert.notEqual(emitPlayers, null);

  await act(async () => {
    emitPlayers?.([hostPlayer, guestPlayer]);
    await Promise.resolve();
  });

  await waitFor(() => {
    view.getByText(/^Bob$/i);
  });

  assert.equal(lobbySubscribeCalls, 1);
});
