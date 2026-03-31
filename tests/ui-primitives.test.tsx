import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { fireEvent, render } from "@testing-library/react";

import { FieldActionButton, FieldInput, FieldShell } from "@/components/ui/field";
import { ModalShell } from "@/components/ui/modal-shell";

import { setupReactTestEnv } from "./react-test-env";

setupReactTestEnv();
const require = createRequire(import.meta.url);

test("Field primitives expose standalone, embedded, and trailing-action contracts", () => {
  const view = render(
    <>
      <FieldInput aria-label="Display name" placeholder="Enter your name" />
      <FieldShell>
        <FieldInput
          aria-label="Room code"
          embedded
          placeholder="ROOM CODE"
        />
        <FieldActionButton aria-label="Join room" type="button">
          Join
        </FieldActionButton>
      </FieldShell>
    </>,
  );

  assert.ok(view.getByRole("textbox", { name: /display name/i }).classList.contains("field-input"));
  assert.ok(view.container.querySelector(".field-shell"));
  assert.ok(view.getByRole("textbox", { name: /room code/i }).classList.contains("field-shell-input"));
  assert.ok(
    view.getByRole("button", { name: /join room/i }).classList.contains("field-trailing-action"),
  );
});

test("ModalShell exposes dialog semantics, closes from overlay and close button, and restores scroll lock", () => {
  let closes = 0;

  const view = render(
    <ModalShell
      isOpen
      onClose={() => {
        closes += 1;
      }}
      title="Pick who you want to be."
    >
      <p>Body</p>
    </ModalShell>,
  );

  const dialog = view.getByRole("dialog", { name: /pick who you want to be/i });
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(document.documentElement.style.overflow, "hidden");

  fireEvent.click(dialog);
  assert.equal(closes, 0);

  fireEvent.click(view.getByRole("button", { name: /close dialog/i }));
  assert.equal(closes, 1);

  fireEvent.click(view.getByRole("presentation"));
  assert.equal(closes, 2);

  view.rerender(
    <ModalShell
      isOpen={false}
      onClose={() => {
        closes += 1;
      }}
      title="Pick who you want to be."
    >
      <p>Body</p>
    </ModalShell>,
  );

  assert.equal(document.body.style.overflow, "");
  assert.equal(document.documentElement.style.overflow, "");
});

test("LobbyScreen loading mode renders the ghost lobby skeleton inside the lobby shell", async () => {
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
    const { LobbyScreen } = await import("@/components/lobby-screen");

    const view = render(
      <LobbyScreen
        copiedShareLink={false}
        currentPlayer={null}
        hostPlayerId={null}
        isLoading
        onCopyShareLink={() => {}}
        onReadyToggle={() => {}}
        onStartGame={() => {}}
        pendingAction={null}
        players={[]}
        roomCode="123456"
        showStartButton
        startDisabled
      />,
    );

    assert.match(
      view.getByText(/^Room 123456 Lobby$/i).textContent ?? "",
      /^Room 123456 Lobby$/i,
    );
    assert.equal(view.container.querySelectorAll(".lobby-player-row-skeleton").length, 3);
    assert.equal(view.container.querySelectorAll(".lobby-avatar-skeleton.skeleton-ghost").length, 3);
    assert.equal(view.container.querySelectorAll(".lobby-ready-pill-skeleton.skeleton-ghost").length, 3);
    assert.equal(view.container.querySelectorAll(".lobby-action-button-skeleton.skeleton-ghost").length, 2);
    assert.equal(view.container.querySelectorAll(".lobby-start-button-skeleton.skeleton-ghost").length, 1);
  } finally {
    if (previousLocalFontModule) {
      require.cache[localFontPath] = previousLocalFontModule;
    } else {
      delete require.cache[localFontPath];
    }
  }
});
