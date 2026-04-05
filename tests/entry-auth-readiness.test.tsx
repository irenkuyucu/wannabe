import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { act, render, waitFor } from "@testing-library/react";

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

function createMenuDependencies() {
  let emitUser: ((user: { uid: string } | null) => void) | null = null;

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
      emitUser = onUser as (user: { uid: string } | null) => void;
      return () => {};
    },
    subscribeToLobby: () => () => {},
    subscribeToRound: () => () => {},
    tickRoom: async () => ({
      deadlineAtMs: null,
      phase: "choice",
      roundIndex: 0,
    }),
  };

  return {
    dependencies,
    resolveAuth(uid = "player-1") {
      if (!emitUser) {
        throw new Error("Auth subscription was not initialized.");
      }

      emitUser({ uid });
    },
  };
}

test("entry actions stay disabled until anonymous auth is ready", async () => {
  const WannabeAppInner = await loadWannabeAppInner();
  const { dependencies, resolveAuth } = createMenuDependencies();

  const view = render(
    <WannabeAppInner
      dependencies={dependencies}
      initialInviteRoomCode="123456"
      initialShowSplash={false}
      router={{
        replace: () => {},
      }}
    />,
  );

  const displayNameInput = view.getByRole("textbox", { name: /display name/i });
  const joinButton = view.getByRole("button", { name: /^join your friends$/i });

  assert.equal(displayNameInput.hasAttribute("disabled"), false);
  assert.equal(joinButton.hasAttribute("disabled"), true);

  await act(async () => {
    resolveAuth();
    await Promise.resolve();
  });

  await waitFor(() => {
    assert.equal(view.getByRole("button", { name: /^join your friends$/i }).hasAttribute("disabled"), false);
  });
});
