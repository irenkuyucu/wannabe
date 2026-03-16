import { buildPhaseViewModel } from "@/lib/in-game-ui";
import { getPromptById } from "@/lib/prompt-catalog";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type ChoiceScreenProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onSubmitChoice: (side: "A" | "B") => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
};

function formatTimer(secondsRemaining: number | null) {
  if (secondsRemaining === null) {
    return "--:--";
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ChoiceScreen({
  currentPlayer,
  nowMs,
  onSubmitChoice,
  pendingAction,
  players,
  room,
  round,
}: ChoiceScreenProps) {
  const viewModel = buildPhaseViewModel({
    room,
    round,
    currentPlayerId: currentPlayer.playerId,
    players,
    nowMs,
  });
  const prompt = getPromptById(round?.promptId ?? room.currentPromptId);
  const selectedChoice = viewModel.selectedChoice;
  const progressPercent = Math.max(
    0,
    Math.min(100, (1 - viewModel.progressRatio) * 100),
  );
  return (
    <section className="choice-screen">
      <div className="choice-screen-shell toy-float">
        <div className="choice-screen-phase-header">
          <div className="choice-screen-phase-row">
            <p className="choice-screen-phase-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="choice-screen-phase-label">Choice</p>
          </div>

          <div className="choice-screen-timer-row">
            <div className="choice-screen-progress-track" aria-hidden="true">
              <div
                className="choice-screen-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="choice-screen-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>
        <p className="choice-screen-prompt-heading">Would you wanna be</p>

        <div className="choice-screen-options">
          <button
            aria-pressed={selectedChoice === "A"}
            className={`choice-screen-option ${selectedChoice === "A" ? "choice-screen-option-active" : ""}`}
            disabled={!viewModel.canSubmitChoice || pendingAction === "choice-A"}
            onClick={() => onSubmitChoice("A")}
            type="button"
          >
            <span className="choice-screen-option-badge choice-screen-option-badge-a">
              {selectedChoice === "A" ? "Locked in" : "Side A"}
            </span>
            <span className="choice-screen-option-copy">
              {prompt?.sideA ?? "Side A prompt loading"}
            </span>
          </button>

          <p className="choice-screen-or">Or</p>

          <button
            aria-pressed={selectedChoice === "B"}
            className={`choice-screen-option ${selectedChoice === "B" ? "choice-screen-option-active" : ""}`}
            disabled={!viewModel.canSubmitChoice || pendingAction === "choice-B"}
            onClick={() => onSubmitChoice("B")}
            type="button"
          >
            <span className="choice-screen-option-badge choice-screen-option-badge-b">
              {selectedChoice === "B" ? "Locked in" : "Side B"}
            </span>
            <span className="choice-screen-option-copy">
              {prompt?.sideB ?? "Side B prompt loading"}
            </span>
          </button>
        </div>

        <p className="choice-screen-note">Missing choices will be auto-assigned</p>
      </div>
    </section>
  );
}
