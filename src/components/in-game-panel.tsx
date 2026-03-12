"use client";

import { HoldButton } from "@/components/hold-button";
import { Button } from "@/components/ui/button";
import {
  buildPhaseViewModel,
  getArgumentBudgetSeconds,
} from "@/lib/in-game-ui";
import { getAvatarOption, getAvatarStyle } from "@/lib/avatar-options";
import { getPromptById } from "@/lib/prompt-catalog";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type InGamePanelProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onAdvanceRebuttal: () => void;
  onEndArgumentTurn: () => void;
  onSubmitChoice: (side: "A" | "B") => void;
  onSubmitVerdict: (verdict: "A_WON" | "B_WON" | "DRAW") => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
};

const PHASE_COPY: Record<
  "choice" | "argument" | "rebuttal" | "verdict" | "resolution",
  { badge: string; title: string; description: string }
> = {
  choice: {
    badge: "Choice phase",
    title: "Lock your side before the timer runs out.",
    description:
      "Pick once. Your choice is permanent for the round and the phase can end early when everyone has locked in.",
  },
  argument: {
    badge: "Argument phase",
    title: "One side speaks at a time.",
    description:
      "Only the current speaking side can end its turn early. Turn order alternates every round.",
  },
  rebuttal: {
    badge: "Rebuttal phase",
    title: "Open floor. Everyone can jump in.",
    description:
      "This is the free-form discussion window. The host can end it early with a two-second hold.",
  },
  verdict: {
    badge: "Verdict phase",
    title: "Call the round: A, B, or draw.",
    description:
      "Each player submits one locked verdict. Missing votes become abstains automatically at timeout.",
  },
  resolution: {
    badge: "Resolution bridge",
    title: "Round resolved. Full summary lands in M4-T4.",
    description:
      "Scores and next-round controls are intentionally held for the next task. This bridge confirms the timed phase loop is complete.",
  },
};

const VERDICT_OPTIONS = [
  {
    id: "A_WON" as const,
    label: "A won",
    tone: "from-[#8cff56] to-[#36d51d] text-[#114f1c]",
  },
  {
    id: "B_WON" as const,
    label: "B won",
    tone: "from-[#59efff] to-[#4d8cff] text-[#14356b]",
  },
  {
    id: "DRAW" as const,
    label: "Draw",
    tone: "from-[#ff8be5] to-[#b55dff] text-white",
  },
];

function formatTimer(secondsRemaining: number | null) {
  if (secondsRemaining === null) {
    return "Host controlled";
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSide(side: "A" | "B") {
  return `Side ${side}`;
}

function formatVerdictLabel(verdict: "A_WON" | "B_WON" | "DRAW") {
  if (verdict === "A_WON") {
    return "A won";
  }

  if (verdict === "B_WON") {
    return "B won";
  }

  return "Draw";
}

function PlayerBadge({
  badgeLabel,
  player,
  side,
  isCurrentPlayer,
}: {
  badgeLabel?: string;
  player: PlayerDoc;
  side?: "A" | "B" | null;
  isCurrentPlayer: boolean;
}) {
  const avatar = getAvatarOption(player.avatarId);

  return (
    <div className="phase-player-card">
      <div
        className="avatar-orb flex size-11 items-center justify-center rounded-full text-2xl"
        style={getAvatarStyle(avatar)}
      >
        {avatar.emoji}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black uppercase text-white">
          {player.displayName}
        </p>
        <p className="text-xs text-[#d8ecff]">
          {isCurrentPlayer
            ? "You"
            : side
              ? `Locked on ${formatSide(side)}`
              : "Waiting"}
        </p>
      </div>
      {badgeLabel ? (
        <span className="hud-pill ml-auto bg-[#103f8f] text-white">{badgeLabel}</span>
      ) : (
        <span className="score-pill ml-auto text-white">{player.score}</span>
      )}
    </div>
  );
}

function SideRoster({
  currentPlayerId,
  players,
  round,
  side,
  title,
  active = false,
}: {
  currentPlayerId: string;
  players: PlayerDoc[];
  round: RoundDoc | null;
  side: "A" | "B";
  title: string;
  active?: boolean;
}) {
  const roster = players.filter((player) => round?.choicesByPlayer[player.playerId] === side);

  return (
    <div className={`phase-roster ${active ? "phase-roster-active" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-black uppercase text-white">{title}</p>
        <span className="hud-pill bg-[#103f8f] text-white">{roster.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {roster.length > 0 ? (
          roster.map((player) => (
            <PlayerBadge
              isCurrentPlayer={player.playerId === currentPlayerId}
              key={player.playerId}
              player={player}
              side={side}
            />
          ))
        ) : (
          <p className="text-sm text-[#d8ecff]">Nobody is locked on this side yet.</p>
        )}
      </div>
    </div>
  );
}

export function InGamePanel({
  currentPlayer,
  nowMs,
  onAdvanceRebuttal,
  onEndArgumentTurn,
  onSubmitChoice,
  onSubmitVerdict,
  pendingAction,
  players,
  room,
  round,
}: InGamePanelProps) {
  const viewModel = buildPhaseViewModel({
    room,
    round,
    currentPlayerId: currentPlayer.playerId,
    players,
    nowMs,
  });
  const prompt = getPromptById(round?.promptId ?? room.currentPromptId);
  const phase = room.phase ?? "resolution";
  const phaseCopy = PHASE_COPY[phase];
  const sideAPenalty = getArgumentBudgetSeconds(round?.penalizedSide ?? null, "A");
  const sideBPenalty = getArgumentBudgetSeconds(round?.penalizedSide ?? null, "B");

  return (
    <div className="flex min-h-[30rem] flex-col gap-5 rounded-[1.8rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="hud-pill bg-[#0c47a9] text-white">Milestone 4 / Task 3</span>
          <span className="hud-pill bg-[#56efff] text-[#0d3560]">{phaseCopy.badge}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="score-pill">
            <span className="text-[#9ad9ff]">Round</span>
            <span className="ml-2 text-white">
              {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </span>
          </div>
          <div className="phase-timer-bubble">
            <span className="text-xs uppercase tracking-[0.16em] text-[#d9eeff]">Timer</span>
            <span className="mt-1 block text-2xl font-black uppercase text-white">
              {formatTimer(viewModel.secondsRemaining)}
            </span>
          </div>
        </div>
      </div>

      <section className="phase-hero-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
              {prompt?.id ?? room.currentPromptId ?? "Live prompt"}
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-white">
              {phaseCopy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#d8ecff]">
              {phaseCopy.description}
            </p>
          </div>
          <div className="phase-progress">
            <div className="progress-track h-4 rounded-full">
              <div
                className="progress-fill rounded-full"
                style={{ width: `${viewModel.progressRatio * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[1.6rem] bg-[#0b3b8f] px-4 py-4 ring-1 ring-white/10">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
            Would you rather be
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="phase-side-pill bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
              {prompt?.sideA ?? "Side A prompt loading"}
            </div>
            <p className="text-center text-sm font-black uppercase tracking-[0.16em] text-[#d8ecff]">
              or
            </p>
            <div className="phase-side-pill bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
              {prompt?.sideB ?? "Side B prompt loading"}
            </div>
          </div>
        </div>
      </section>

      {phase === "choice" ? (
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <button
              className={`choice-card ${viewModel.selectedChoice === "A" ? "choice-card-active" : ""}`}
              disabled={!viewModel.canSubmitChoice || pendingAction === "choice-A"}
              onClick={() => onSubmitChoice("A")}
              type="button"
            >
              <span className="choice-tag bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
                Side A
              </span>
              <span className="mt-4 block text-2xl font-black uppercase text-white">
                {prompt?.sideA ?? "Loading"}
              </span>
              <span className="mt-3 block text-sm text-[#d8ecff]">
                {viewModel.selectedChoice === "A"
                  ? "Locked in. You are committed to Side A for this round."
                  : `${viewModel.choiceCounts.A} player${viewModel.choiceCounts.A === 1 ? "" : "s"} locked here.`}
              </span>
            </button>

            <button
              className={`choice-card ${viewModel.selectedChoice === "B" ? "choice-card-active" : ""}`}
              disabled={!viewModel.canSubmitChoice || pendingAction === "choice-B"}
              onClick={() => onSubmitChoice("B")}
              type="button"
            >
              <span className="choice-tag bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                Side B
              </span>
              <span className="mt-4 block text-2xl font-black uppercase text-white">
                {prompt?.sideB ?? "Loading"}
              </span>
              <span className="mt-3 block text-sm text-[#d8ecff]">
                {viewModel.selectedChoice === "B"
                  ? "Locked in. You are committed to Side B for this round."
                  : `${viewModel.choiceCounts.B} player${viewModel.choiceCounts.B === 1 ? "" : "s"} locked here.`}
              </span>
            </button>
          </div>

          <div className="phase-roster">
            <p className="text-base font-black uppercase text-white">Live lock-in</p>
            <p className="mt-2 text-sm text-[#d8ecff]">
              Choices are visible here as players commit. Once you lock, you cannot switch sides.
            </p>
            <div className="mt-4 space-y-2">
              {players.map((player) => (
                <PlayerBadge
                  badgeLabel={round?.choicesByPlayer[player.playerId] ?? "WAIT"}
                  isCurrentPlayer={player.playerId === currentPlayer.playerId}
                  key={player.playerId}
                  player={player}
                  side={round?.choicesByPlayer[player.playerId] ?? null}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {phase === "argument" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <SideRoster
              active={room.activeArgumentSide === "A"}
              currentPlayerId={currentPlayer.playerId}
              players={players}
              round={round}
              side="A"
              title={`Side A · ${sideAPenalty}s budget`}
            />
            <SideRoster
              active={room.activeArgumentSide === "B"}
              currentPlayerId={currentPlayer.playerId}
              players={players}
              round={round}
              side="B"
              title={`Side B · ${sideBPenalty}s budget`}
            />
          </div>

          <div className="phase-roster">
            <p className="text-base font-black uppercase text-white">Turn state</p>
            <p className="mt-3 text-2xl font-black uppercase text-white">
              {room.activeArgumentSide ? `${formatSide(room.activeArgumentSide)} is speaking.` : "Waiting"}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#d8ecff]">
              Round order is {formatSide(viewModel.argumentOrder[0])} first, then{" "}
              {formatSide(viewModel.argumentOrder[1])}. This phase flips every round.
            </p>
            {round?.penalizedSide ? (
              <div className="status-callout mt-4">
                Dissenter penalty is active on {formatSide(round.penalizedSide)} this round, so that side only gets 100 seconds.
              </div>
            ) : null}
            <div className="mt-4">
              {viewModel.canEndArgumentTurn ? (
                <HoldButton
                  disabled={pendingAction === "end-turn"}
                  holdingLabel="Keep holding..."
                  idleLabel={pendingAction === "end-turn" ? "Ending turn..." : "Hold 2s to end turn"}
                  onHoldComplete={onEndArgumentTurn}
                  size="lg"
                />
              ) : (
                <div className="status-callout">
                  Only players on the speaking side see the early end-turn control.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {phase === "rebuttal" ? (
        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="phase-roster">
            <p className="text-base font-black uppercase text-white">Rebuttal brief</p>
            <p className="mt-3 text-2xl font-black uppercase text-white">
              Everyone talks. Nobody owns the floor.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#d8ecff]">
              Use this minute for crossfire, callbacks, and closing pushes before the vote starts.
            </p>
            <div className="mt-4 grid gap-2">
              {players.map((player) => (
                <PlayerBadge
                  isCurrentPlayer={player.playerId === currentPlayer.playerId}
                  key={player.playerId}
                  player={player}
                  side={round?.choicesByPlayer[player.playerId] ?? null}
                />
              ))}
            </div>
          </div>

          <div className="phase-roster">
            <p className="text-base font-black uppercase text-white">Host control</p>
            <p className="mt-3 text-sm leading-7 text-[#d8ecff]">
              The timer will auto-advance to verdict, but the host can cut rebuttal short if the room is done.
            </p>
            <div className="mt-4">
              {viewModel.canAdvanceRebuttal ? (
                <HoldButton
                  disabled={pendingAction === "advance-rebuttal"}
                  holdingLabel="Keep holding..."
                  idleLabel={
                    pendingAction === "advance-rebuttal"
                      ? "Advancing..."
                      : "Host hold 2s to advance"
                  }
                  onHoldComplete={onAdvanceRebuttal}
                  size="lg"
                  variant="secondary"
                />
              ) : (
                <div className="status-callout">
                  Only the host sees the early-advance control during rebuttal.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {phase === "verdict" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            {VERDICT_OPTIONS.map((option) => (
              <button
                className={`choice-card ${viewModel.selectedVerdict === option.id ? "choice-card-active" : ""}`}
                disabled={!viewModel.canSubmitVerdict || pendingAction === `verdict-${option.id}`}
                key={option.id}
                onClick={() => onSubmitVerdict(option.id)}
                type="button"
              >
                <span className={`choice-tag bg-linear-to-r ${option.tone}`}>{option.label}</span>
                <span className="mt-4 block text-sm text-[#d8ecff]">
                  {viewModel.selectedVerdict === option.id
                    ? `Locked. Your verdict is ${option.label}.`
                    : `${viewModel.verdictCounts[option.id]} vote${viewModel.verdictCounts[option.id] === 1 ? "" : "s"} for ${option.label}.`}
                </span>
              </button>
            ))}
          </div>

          <div className="phase-roster">
            <p className="text-base font-black uppercase text-white">Live vote board</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {VERDICT_OPTIONS.map((option) => (
                <div className="toy-chip-panel rounded-[1.4rem] px-4 py-4" key={option.id}>
                  <p className="text-sm font-black uppercase text-white">
                    {formatVerdictLabel(option.id)}
                  </p>
                  <p className="mt-2 text-3xl font-black uppercase text-white">
                    {viewModel.verdictCounts[option.id]}
                  </p>
                </div>
              ))}
            </div>
            {viewModel.selectedVerdict && viewModel.selectedVerdict !== "ABSTAIN" ? (
              <div className="status-callout mt-4">
                Your verdict is locked as {formatVerdictLabel(viewModel.selectedVerdict)}.
              </div>
            ) : (
              <div className="status-callout mt-4">
                Submit before timeout. Missing votes turn into abstains automatically.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {phase === "resolution" ? (
        <section className="phase-roster">
          <p className="text-base font-black uppercase text-white">Next task boundary</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d8ecff]">
            The timed round flow reached resolution successfully. `M4-T4` will replace this bridge with the real scoreboard, winner messaging, and host progression controls.
          </p>
          <div className="mt-4">
            <Button disabled size="lg" variant="secondary">
              Resolution UI lands in M4-T4
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
