import assert from "node:assert/strict";
import test from "node:test";

import { act, fireEvent, render, within } from "@testing-library/react";

import { AvatarPickerModal } from "@/components/avatar-picker-modal";
import { Button } from "@/components/ui/button";
import { ChoiceScreen } from "@/components/choice-screen";
import { ResolutionScreen } from "@/components/resolution-screen";
import { Scoreboard } from "@/components/scoreboard";
import { VerdictScreen } from "@/components/verdict-screen";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

import { setupReactTestEnv } from "./react-test-env";

setupReactTestEnv();

function createPlayer(overrides: Partial<PlayerDoc>): PlayerDoc {
  return {
    avatarId: "avatar-1",
    displayName: "Player",
    joinedAtMs: 1,
    playerId: "player-1",
    ready: true,
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
    phaseDeadlineAtMs: 120_000,
    pendingPenaltyPlayerId: null,
    roomCode: "123456",
    roomId: "room-1",
    roundIndex: 0,
    roundsTotal: 10,
    status: "inGame",
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

test("ChoiceScreen renders locked choice state", () => {
  const alice = createPlayer({ displayName: "Alice", playerId: "alice", score: 3, uid: "alice" });
  const bob = createPlayer({ displayName: "Bob", playerId: "bob", score: 2, uid: "bob" });
  let submitted: "A" | "B" | null = null;

  const view = render(
    <ChoiceScreen
      currentPlayer={alice}
      nowMs={60_000}
      onSubmitChoice={(side) => {
        submitted = side;
      }}
      pendingAction={null}
      players={[alice, bob]}
      room={createRoom({ phaseDeadlineAtMs: 90_000 })}
      round={createRound({
        choicesByPlayer: {
          alice: "A",
          bob: "B",
        },
      })}
    />,
  );

  const buttons = view.getAllByRole("button");
  assert.equal(buttons.length, 2);

  const sideA = view.getByRole("button", { name: /locked in/i });
  const sideB = view.getByRole("button", { name: /side b/i });

  assert.equal(sideA.getAttribute("aria-pressed"), "true");
  assert.equal(sideA.hasAttribute("disabled"), true);
  assert.equal(sideB.hasAttribute("disabled"), true);
  assert.match(view.getByText(/^Locked in$/i).textContent ?? "", /^Locked in$/i);
  fireEvent.click(sideB);
  assert.equal(submitted, null);
});

test("AvatarPickerModal lists the local avatar set and emits selections", () => {
  let selectedAvatarId: string | null = null;

  const view = render(
    <AvatarPickerModal
      isOpen
      onClose={() => {}}
      onSelect={(avatarId) => {
        selectedAvatarId = avatarId;
      }}
      selectedAvatarId="avatar-1"
    />,
  );

  const avatarButtons = view.getAllByRole("button", { name: /select avatar/i });
  assert.equal(avatarButtons.length, 25);

  fireEvent.click(view.getByRole("button", { name: /select avatar 12/i }));
  assert.equal(selectedAvatarId, "avatar-12");
});

test("Button hold interaction requires a sustained press before completing", async () => {
  let completions = 0;

  const view = render(
    <Button
      className="btn-hold btn-phase"
      durationMs={80}
      holdingLabel="Keep holding..."
      interaction="hold"
      onHoldComplete={() => {
        completions += 1;
      }}
    >
      Hold to end turn
    </Button>,
  );

  const button = view.getByRole("button", { name: /hold to end turn/i });

  await act(async () => {
    fireEvent.pointerDown(button);
  });
  assert.match(
    view.getByRole("button", { name: /keep holding/i }).textContent ?? "",
    /keep holding/i,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  await act(async () => {
    fireEvent.pointerUp(button);
  });
  assert.equal(completions, 0);
  assert.match(
    view.getByRole("button", { name: /hold to end turn/i }).textContent ?? "",
    /hold to end turn/i,
  );

  await act(async () => {
    fireEvent.pointerDown(button);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  assert.equal(completions, 1);
});

test("VerdictScreen renders vote counters and locked selection state", () => {
  const alice = createPlayer({ displayName: "Alice", playerId: "alice", uid: "alice" });
  const bob = createPlayer({ displayName: "Bob", playerId: "bob", uid: "bob" });

  const view = render(
    <VerdictScreen
      currentPlayer={alice}
      nowMs={60_000}
      onSubmitVerdict={() => {
        throw new Error("should not submit when locked");
      }}
      pendingAction={null}
      players={[alice, bob]}
      room={createRoom({ phase: "verdict", phaseDeadlineAtMs: 90_000 })}
      round={createRound({
        verdictsByPlayer: {
          alice: "A_WON",
          bob: "DRAW",
        },
      })}
    />,
  );

  const options = view.getAllByRole("button");
  assert.equal(options.length, 3);
  assert.equal(options[0].getAttribute("aria-pressed"), "true");
  assert.equal(options[0].hasAttribute("disabled"), true);
  assert.match(within(options[0]).getByText(/^1 vote$/i).textContent ?? "", /^1 vote$/i);
  assert.match(within(options[2]).getByText(/^1 vote$/i).textContent ?? "", /^1 vote$/i);
});

test("Scoreboard shows host and dissenter annotations", () => {
  const alice = createPlayer({ displayName: "Alice", playerId: "alice", uid: "alice" });
  const charlie = createPlayer({ displayName: "Charlie", playerId: "charlie", uid: "charlie" });

  const view = render(
    <Scoreboard
      entries={[
        {
          displayName: "Alice",
          isDissenter: false,
          playerId: "alice",
          score: 5,
          scoreDelta: 1,
        },
        {
          displayName: "Charlie",
          isDissenter: true,
          playerId: "charlie",
          score: 4,
          scoreDelta: 0,
        },
      ]}
      hostPlayerId="alice"
      players={[alice, charlie]}
      showRoundColumn
    />,
  );

  assert.match(view.getByText(/Alice \(Host\)/i).textContent ?? "", /Alice \(Host\)/i);
  assert.match(view.getByText(/^Dissenter$/i).textContent ?? "", /^Dissenter$/i);
  assert.match(view.getByText(/^\+1$/i).textContent ?? "", /^\+1$/i);
  assert.match(view.getAllByText(/^-$/i)[0].textContent ?? "", /^-$/i);
});

test("ResolutionScreen renders dissenter copy for host and waiting copy for non-host", () => {
  const alice = createPlayer({ displayName: "Alice", playerId: "alice", uid: "alice", score: 5 });
  const bob = createPlayer({ displayName: "Bob", playerId: "bob", uid: "bob", score: 4 });
  const charlie = createPlayer({
    displayName: "Charlie",
    playerId: "charlie",
    uid: "charlie",
    score: 4,
  });
  const players = [alice, bob, charlie];
  const round = createRound({
    choicesByPlayer: {
      alice: "A",
      bob: "A",
      charlie: "B",
    },
    dissenterPlayerId: "charlie",
    outcome: "A_WON",
    resolvedAtMs: 10,
    verdictsByPlayer: {
      alice: "A_WON",
      bob: "A_WON",
      charlie: "B_WON",
    },
  });

  const view = render(
    <ResolutionScreen
      currentPlayer={alice}
      onAdvanceResolution={() => {}}
      pendingAction={null}
      players={players}
      room={createRoom({ hostPlayerId: "alice", phase: "resolution", phaseDeadlineAtMs: null })}
      round={round}
    />,
  );

  assert.match(view.getByText(/^Dissenter!$/i).textContent ?? "", /^Dissenter!$/i);
  assert.match(
    view.getByText(/charlie voted otherwise/i).textContent ?? "",
    /charlie voted otherwise/i,
  );
  assert.match(
    view.getByRole("button", { name: /hold for next round/i }).textContent ?? "",
    /hold for next round/i,
  );

  view.rerender(
    <ResolutionScreen
      currentPlayer={bob}
      onAdvanceResolution={() => {}}
      pendingAction={null}
      players={players}
      room={createRoom({ hostPlayerId: "alice", phase: "resolution", phaseDeadlineAtMs: null })}
      round={createRound({
        choicesByPlayer: {
          alice: "A",
          bob: "B",
          charlie: "B",
        },
        outcome: "B_WON",
        resolvedAtMs: 10,
        verdictsByPlayer: {
          alice: "B_WON",
          bob: "B_WON",
          charlie: "B_WON",
        },
      })}
    />,
  );

  assert.match(view.getByText(/^Side B wins the round$/i).textContent ?? "", /^Side B wins the round$/i);
  assert.equal(view.queryByRole("button", { name: /hold for next round/i }), null);
  assert.match(
    view.getByText(/host will advance the game/i).textContent ?? "",
    /host will advance the game/i,
  );
});
