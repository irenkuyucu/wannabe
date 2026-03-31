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
    <section className="game-screen choice">
      <div className="game-screen-shell surface-enter">
        <div className="game-meta">
          <div className="game-meta-row">
            <p className="game-meta-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="game-meta-label">Choice</p>
          </div>

          <div className="game-timer-row">
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill progress-fill-orange"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="game-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>
        <p className="choice-prompt-heading">Would you wanna be</p>

        <div className="choice-options">
          <button
            aria-pressed={selectedChoice === "A"}
            className={`card choice-option ${selectedChoice === "A" ? "card-active" : ""}`}
            disabled={!viewModel.canSubmitChoice || pendingAction === "choice-A"}
            onClick={() => onSubmitChoice("A")}
            type="button"
          >
            <span className="badge badge-green choice-option-badge">
              {selectedChoice === "A" ? "Locked in" : "Side A"}
            </span>
            <span className="choice-option-copy">
              {prompt?.sideA ?? "Side A prompt loading"}
            </span>
          </button>

          <p className="choice-or">Or</p>

          <button
            aria-pressed={selectedChoice === "B"}
            className={`card choice-option ${selectedChoice === "B" ? "card-active" : ""}`}
            disabled={!viewModel.canSubmitChoice || pendingAction === "choice-B"}
            onClick={() => onSubmitChoice("B")}
            type="button"
          >
            <span className="badge badge-blue choice-option-badge">
              {selectedChoice === "B" ? "Locked in" : "Side B"}
            </span>
            <span className="choice-option-copy">
              {prompt?.sideB ?? "Side B prompt loading"}
            </span>
          </button>
        </div>

        <p className="choice-note">Missing choices will be auto-assigned</p>
      </div>
    </section>
  );
}
