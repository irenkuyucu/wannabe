"use client";

import { buildPhaseViewModel } from "@/lib/in-game-ui";
import { getPromptById } from "@/lib/prompt-catalog";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type VerdictScreenProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onSubmitVerdict: (verdict: "A_WON" | "B_WON" | "DRAW") => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
};

const VERDICT_OPTIONS = [
  {
    id: "A_WON" as const,
    countKey: "A_WON" as const,
    label: "A coffee roaster",
    pillClassName: "verdict-screen-vote-pill-a",
  },
  {
    id: "B_WON" as const,
    countKey: "B_WON" as const,
    label: "A tea sommelier",
    pillClassName: "verdict-screen-vote-pill-b",
  },
  {
    id: "DRAW" as const,
    countKey: "DRAW" as const,
    label: "Draw",
    pillClassName: "verdict-screen-vote-pill-draw",
  },
];

function formatTimer(secondsRemaining: number | null) {
  if (secondsRemaining === null) {
    return "--:--";
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatVoteCount(count: number) {
  return `${count} vote${count === 1 ? "" : "s"}`;
}

export function VerdictScreen({
  currentPlayer,
  nowMs,
  onSubmitVerdict,
  pendingAction,
  players,
  room,
  round,
}: VerdictScreenProps) {
  const viewModel = buildPhaseViewModel({
    room,
    round,
    currentPlayerId: currentPlayer.playerId,
    players,
    nowMs,
  });
  const prompt = getPromptById(round?.promptId ?? room.currentPromptId);
  const remainingPercent = Math.max(
    0,
    Math.min(100, (1 - viewModel.progressRatio) * 100),
  );
  return (
    <section className="game-screen verdict-screen">
      <div className="game-screen-shell toy-float">
        <div className="game-meta">
          <div className="game-meta-row">
            <p className="game-meta-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="game-meta-label">Verdict</p>
          </div>

          <div className="game-timer-row">
            <div className="game-progress-track" aria-hidden="true">
              <div
                className="game-progress-fill"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <p className="game-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>
        <p className="verdict-screen-title">Who won the round?</p>
        <p className="verdict-screen-subtitle">
          If the group can&apos;t agree,
          <br />
          the round will end as a draw
        </p>

        <div className="verdict-screen-options">
          {VERDICT_OPTIONS.map((option) => {
            const voteCount = viewModel.verdictCounts[option.countKey];
            const isSelected = viewModel.selectedVerdict === option.id;
            const pendingKey = `verdict-${option.id}`;
            const label =
              option.id === "A_WON"
                ? prompt?.sideA ?? option.label
                : option.id === "B_WON"
                  ? prompt?.sideB ?? option.label
                  : option.label;

            return (
              <button
                aria-pressed={isSelected}
                className={`verdict-screen-option ${isSelected ? "verdict-screen-option-active" : ""}`}
                disabled={!viewModel.canSubmitVerdict || pendingAction === pendingKey}
                key={option.id}
                onClick={() => onSubmitVerdict(option.id)}
                type="button"
              >
                <span className={`verdict-screen-vote-pill ${option.pillClassName}`}>
                  {formatVoteCount(voteCount)}
                </span>
                <span className="verdict-screen-option-copy">{label}</span>
              </button>
            );
          })}
        </div>

        <p className="verdict-screen-note">Missing votes don&apos;t count toward the result</p>
      </div>
    </section>
  );
}
