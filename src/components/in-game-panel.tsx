"use client";

import { AvatarArt } from "@/components/avatar-art";
import { HoldButton } from "@/components/hold-button";
import { SessionScoreboard } from "@/components/session-scoreboard";
import {
  buildPhaseViewModel,
  getArgumentBudgetSeconds,
} from "@/lib/in-game-ui";
import { getAvatarOption } from "@/lib/avatar-options";
import { getPromptById } from "@/lib/prompt-catalog";
import { buildResolutionSummary } from "@/lib/session-summary";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type InGamePanelProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onAdvanceResolution: () => void;
  onAdvanceRebuttal: () => void;
  onEndArgumentTurn: () => void;
  onSubmitChoice: (side: "A" | "B") => void;
  onSubmitVerdict: (verdict: "A_WON" | "B_WON" | "DRAW") => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
  showDetails: boolean;
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
    badge: "Resolution phase",
    title: "The round is scored. Debrief before moving on.",
    description:
      "Check the outcome, score swing, and any bonus or dissenter notes before the host advances.",
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

function getOutcomeTone(outcome: "A_WON" | "B_WON" | "DRAW" | null) {
  if (outcome === "A_WON") {
    return "bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]";
  }

  if (outcome === "B_WON") {
    return "bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]";
  }

  return "bg-linear-to-r from-[#ff8be5] to-[#b55dff] text-white";
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
        className="avatar-orb flex size-[36px] items-center justify-center rounded-full text-[18.4px]"
      >
        <AvatarArt avatar={avatar} className="avatar-image" decorative />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13.12px] font-black uppercase text-white">
          {player.displayName}
        </p>
        <p className="text-[11.52px] text-[#d8ecff]">
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
      <div className="flex items-center justify-between gap-[12px]">
        <p className="text-[14px] font-black uppercase text-white">{title}</p>
        <span className="hud-pill bg-[#103f8f] text-white">{roster.length}</span>
      </div>
      <div className="mt-[12px] space-y-[8px]">
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
          <p className="text-[14px] text-[#d8ecff]">Nobody is locked on this side yet.</p>
        )}
      </div>
    </div>
  );
}

export function InGamePanel({
  currentPlayer,
  nowMs,
  onAdvanceResolution,
  onAdvanceRebuttal,
  onEndArgumentTurn,
  onSubmitChoice,
  onSubmitVerdict,
  pendingAction,
  players,
  room,
  round,
  showDetails,
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
  const countdownProgressPercent =
    phase === "resolution" ? 100 : Math.max(0, Math.min(100, (1 - viewModel.progressRatio) * 100));
  const sideAPenalty = getArgumentBudgetSeconds(
    round?.penalizedPlayerId ?? null,
    round?.choicesByPlayer,
    "A",
  );
  const sideBPenalty = getArgumentBudgetSeconds(
    round?.penalizedPlayerId ?? null,
    round?.choicesByPlayer,
    "B",
  );
  const penalizedPlayer = players.find(
    (player) => player.playerId === round?.penalizedPlayerId,
  );
  const resolutionSummary = buildResolutionSummary({ room, round, players });

  return (
    <div className="flex min-h-[320px] flex-col gap-[14px] rounded-[24px] bg-[#082f76] px-[16px] py-[16px] ring-1 ring-white/10 sm:px-[20px] sm:py-[20px] lg:min-h-[384px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex flex-wrap items-center gap-[12px]">
          <span className="hud-pill bg-[#56efff] text-[#0d3560]">{phaseCopy.badge}</span>
          {showDetails ? (
            <span className="hud-pill bg-[#0c47a9] text-white">
              {prompt?.id ?? room.currentPromptId ?? "Live prompt"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-[12px]">
          <div className="score-pill">
            <span className="text-[#9ad9ff]">Round</span>
            <span className="ml-[8px] text-white">
              {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </span>
          </div>
          <div className="phase-timer-bubble">
            <span className="text-[12px] uppercase tracking-[0.16em] text-[#d9eeff]">Timer</span>
            <span className="mt-[4px] block text-[20px] font-black uppercase text-white">
              {formatTimer(viewModel.secondsRemaining)}
            </span>
          </div>
        </div>
      </div>

      <section className="phase-hero-card">
        <div className="flex flex-wrap items-start justify-between gap-[16px]">
          <div className="max-w-3xl">
            <h2 className="mt-[8px] text-[clamp(24.8px,2.1vw,39.2px)] font-black uppercase tracking-[-0.04em] text-white">
              {phaseCopy.title}
            </h2>
            <p className="mt-[12px] max-w-2xl text-[14px] leading-[24px] text-[#d8ecff] sm:text-[16px] sm:leading-[28px]">
              {phaseCopy.description}
            </p>
          </div>
          <div className="phase-progress">
            <div className="progress-track h-[16px] rounded-full">
              <div
                className="progress-fill rounded-full"
                style={{ width: `${countdownProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-[12px] rounded-[20.8px] bg-[#0b3b8f] px-[16px] py-[16px] ring-1 ring-white/10">
          <p className="text-[14px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
            Would you rather be
          </p>
          <div className="mt-[16px] grid gap-[12px] md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="phase-side-pill bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
              {prompt?.sideA ?? "Side A prompt loading"}
            </div>
            <p className="text-center text-[14px] font-black uppercase tracking-[0.16em] text-[#d8ecff]">
              or
            </p>
            <div className="phase-side-pill bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
              {prompt?.sideB ?? "Side B prompt loading"}
            </div>
          </div>
        </div>
      </section>

      {phase === "choice" ? (
        <section className="grid gap-[16px]">
          <div className="grid gap-[16px] xl:grid-cols-2">
            <button
              className={`choice-card ${viewModel.selectedChoice === "A" ? "choice-card-active" : ""}`}
              disabled={!viewModel.canSubmitChoice || pendingAction === "choice-A"}
              onClick={() => onSubmitChoice("A")}
              type="button"
            >
              <span className="choice-tag bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
                Side A
              </span>
              <span className="mt-[12px] block text-[23.2px] font-black uppercase text-white">
                {prompt?.sideA ?? "Loading"}
              </span>
              <span className="mt-[8px] block text-[14px] text-[#d8ecff]">
                {viewModel.selectedChoice === "A"
                  ? "Locked in. You are committed to Side A for this round."
                  : showDetails
                    ? `${viewModel.choiceCounts.A} player${viewModel.choiceCounts.A === 1 ? "" : "s"} locked here.`
                    : "Choose the side you want to defend this round."}
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
              <span className="mt-[12px] block text-[23.2px] font-black uppercase text-white">
                {prompt?.sideB ?? "Loading"}
              </span>
              <span className="mt-[8px] block text-[14px] text-[#d8ecff]">
                {viewModel.selectedChoice === "B"
                  ? "Locked in. You are committed to Side B for this round."
                  : showDetails
                    ? `${viewModel.choiceCounts.B} player${viewModel.choiceCounts.B === 1 ? "" : "s"} locked here.`
                    : "Choose the side you want to defend this round."}
              </span>
            </button>
          </div>

          {showDetails ? (
            <div className="phase-roster">
              <p className="text-[14px] font-black uppercase text-white">Live lock-in</p>
              <p className="mt-[8px] text-[14px] text-[#d8ecff]">
                Choices are visible here as players commit. Once you lock, you cannot switch sides.
              </p>
              <div className="mt-[16px] space-y-[8px]">
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
          ) : null}
        </section>
      ) : null}

      {phase === "argument" ? (
        <section className="grid gap-[16px]">
          <div className="phase-roster">
            <p className="text-[14px] font-black uppercase text-white">Current turn</p>
            <p className="mt-[12px] text-[24.8px] font-black uppercase text-white">
              {room.activeArgumentSide ? `${formatSide(room.activeArgumentSide)} is speaking.` : "Waiting"}
            </p>
            <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
              Keep the floor with the current side until the timer ends or an eligible player ends the turn early.
            </p>
            {penalizedPlayer ? (
              <div className="status-callout mt-[16px]">
                {penalizedPlayer.displayName} carries the dissenter penalty this round, reducing the speaking budget for whichever side they joined.
              </div>
            ) : null}
            <div className="mt-[16px]">
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

          {showDetails ? (
            <div className="grid gap-[16px] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-[16px] md:grid-cols-2">
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
                <p className="text-[14px] font-black uppercase text-white">Turn details</p>
                <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
                  Round order is {formatSide(viewModel.argumentOrder[0])} first, then{" "}
                  {formatSide(viewModel.argumentOrder[1])}. This phase flips every round.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase === "rebuttal" ? (
        <section className="grid gap-[16px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="phase-roster">
            <p className="text-[14px] font-black uppercase text-white">Rebuttal brief</p>
            <p className="mt-[12px] text-[24.8px] font-black uppercase text-white">
              Everyone talks. Nobody owns the floor.
            </p>
            <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
              Use this minute for crossfire, callbacks, and closing pushes before the vote starts.
            </p>
            {showDetails ? (
              <div className="mt-[16px] grid gap-[8px]">
                {players.map((player) => (
                  <PlayerBadge
                    isCurrentPlayer={player.playerId === currentPlayer.playerId}
                    key={player.playerId}
                    player={player}
                    side={round?.choicesByPlayer[player.playerId] ?? null}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="phase-roster">
            <p className="text-[14px] font-black uppercase text-white">Host control</p>
            <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
              The timer will auto-advance to verdict, but the host can cut rebuttal short if the room is done.
            </p>
            <div className="mt-[16px]">
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
        <section className="grid gap-[16px]">
          <div className="grid gap-[16px]">
            {VERDICT_OPTIONS.map((option) => (
              <button
                className={`choice-card ${viewModel.selectedVerdict === option.id ? "choice-card-active" : ""}`}
                disabled={!viewModel.canSubmitVerdict || pendingAction === `verdict-${option.id}`}
                key={option.id}
                onClick={() => onSubmitVerdict(option.id)}
                type="button"
              >
                <span className={`choice-tag bg-linear-to-r ${option.tone}`}>{option.label}</span>
                <span className="mt-[16px] block text-[14px] text-[#d8ecff]">
                  {viewModel.selectedVerdict === option.id
                    ? `Locked. Your verdict is ${option.label}.`
                    : `${viewModel.verdictCounts[option.id]} vote${viewModel.verdictCounts[option.id] === 1 ? "" : "s"} for ${option.label}.`}
                </span>
              </button>
            ))}
          </div>

          {viewModel.selectedVerdict && viewModel.selectedVerdict !== "ABSTAIN" ? (
            <div className="status-callout">
              Your verdict is locked as {formatVerdictLabel(viewModel.selectedVerdict)}.
            </div>
          ) : (
            <div className="status-callout">
              Submit before timeout. Missing votes turn into abstains automatically.
            </div>
          )}

          {showDetails ? (
            <div className="phase-roster">
              <p className="text-[14px] font-black uppercase text-white">Live vote board</p>
              <div className="mt-[16px] grid gap-[12px] sm:grid-cols-3 lg:grid-cols-1">
                {VERDICT_OPTIONS.map((option) => (
                  <div className="toy-chip-panel rounded-[22.4px] px-[16px] py-[16px]" key={option.id}>
                    <p className="text-[14px] font-black uppercase text-white">
                      {formatVerdictLabel(option.id)}
                    </p>
                    <p className="mt-[8px] text-[24px] font-black uppercase text-white">
                      {viewModel.verdictCounts[option.id]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase === "resolution" ? (
        <section className="grid gap-[16px] lg:grid-cols-[1fr_1.08fr]">
          <div className="grid gap-[16px]">
            <div className="phase-roster">
              <div className="flex flex-wrap items-center justify-between gap-[12px]">
                <p className="text-[14px] font-black uppercase text-white">Round result</p>
                <span
                  className={`choice-tag ${getOutcomeTone(resolutionSummary.outcome)}`}
                >
                  {resolutionSummary.outcomeLabel}
                </span>
              </div>
              <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
                {resolutionSummary.outcomeReason}
              </p>
              {showDetails ? (
                <>
                  <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
                    <div className="toy-chip-panel rounded-[22.4px] px-[16px] py-[16px]">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Non-abstaining votes
                      </p>
                      <p className="mt-[8px] text-[24px] font-black uppercase text-white">
                        {resolutionSummary.nonAbstainingCount}
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[22.4px] px-[16px] py-[16px]">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Round state
                      </p>
                      <p className="mt-[8px] text-[20px] font-black uppercase text-white">
                        {resolutionSummary.isFinalRound ? "Final round" : "Next round ready"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
                    <div className="phase-player-card">
                      <div>
                        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                          Verdict board
                        </p>
                        <p className="mt-[8px] text-[14px] text-white">
                          A won {resolutionSummary.verdictCounts.A_WON}
                        </p>
                        <p className="mt-[4px] text-[14px] text-white">
                          B won {resolutionSummary.verdictCounts.B_WON}
                        </p>
                      </div>
                    </div>
                    <div className="phase-player-card">
                      <div>
                        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                          Missing or split
                        </p>
                        <p className="mt-[8px] text-[14px] text-white">
                          Draw {resolutionSummary.verdictCounts.DRAW}
                        </p>
                        <p className="mt-[4px] text-[14px] text-white">
                          Abstain {resolutionSummary.verdictCounts.ABSTAIN}
                        </p>
                      </div>
                    </div>
                  </div>
                  {resolutionSummary.bonusPlayer ? (
                    <div className="status-callout mt-[16px]">
                      Lone-side bonus stayed with {resolutionSummary.bonusPlayer.displayName}. If
                      that player won the round, the scoreboard reflects the extra point.
                    </div>
                  ) : null}
                  {resolutionSummary.dissenterPlayer ? (
                    <div className="status-callout mt-[16px]">
                      {resolutionSummary.dissenterPlayer.displayName} is the dissenter this round and
                      carries the next-round argument penalty.
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="phase-roster">
              <p className="text-[14px] font-black uppercase text-white">Host control</p>
              <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
                {resolutionSummary.isFinalRound
                  ? "The scoreboard is final. The host sends everyone to game over from here."
                  : "Once the room is ready, the host launches the next prompt from resolution."}
              </p>
              <div className="mt-[16px]">
                {room.hostPlayerId === currentPlayer.playerId ? (
                  <HoldButton
                    disabled={pendingAction === "advance-resolution"}
                    holdingLabel="Keep holding..."
                    idleLabel={
                      pendingAction === "advance-resolution"
                        ? "Advancing..."
                        : resolutionSummary.isFinalRound
                          ? "Host hold 2s for game over"
                          : "Host hold 2s for next round"
                    }
                    onHoldComplete={onAdvanceResolution}
                    size="lg"
                  />
                ) : (
                  <div className="status-callout">
                    Waiting for the host to {resolutionSummary.isFinalRound ? "open game over." : "advance to the next round."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="phase-roster">
            <div className="flex flex-wrap items-center justify-between gap-[12px]">
              <p className="text-[14px] font-black uppercase text-white">Scoreboard</p>
              <span className="score-pill text-white">
                Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
              </span>
            </div>
            <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
              Points are already applied. Badges show forced assignments, lone-side bonus status,
              and the dissenter if one was identified.
            </p>
            <div className="mt-[16px]">
              <SessionScoreboard
                currentPlayerId={currentPlayer.playerId}
                entries={resolutionSummary.scoreboard}
                players={players}
                showRoundMeta
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
