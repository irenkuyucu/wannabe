"use client";

import { FloatingAvatarField } from "@/components/floating-avatar-field";
import { Button } from "@/components/ui/button";
import { buildPhaseViewModel } from "@/lib/in-game-ui";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type RebuttalScreenProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onAdvanceRebuttal: () => void;
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

export function RebuttalScreen({
  currentPlayer,
  nowMs,
  onAdvanceRebuttal,
  pendingAction,
  players,
  room,
  round,
}: RebuttalScreenProps) {
  const viewModel = buildPhaseViewModel({
    room,
    round,
    currentPlayerId: currentPlayer.playerId,
    players,
    nowMs,
  });
  const remainingPercent = Math.max(
    0,
    Math.min(100, (1 - viewModel.progressRatio) * 100),
  );
  const isHost = room.hostPlayerId === currentPlayer.playerId;
  return (
    <section className="game-screen rebuttal">
      <div className="game-screen-shell surface-enter">
        <div className="game-meta">
          <div className="game-meta-row">
            <p className="game-meta-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="game-meta-label">Rebuttal</p>
          </div>

          <div className="game-timer-row">
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill progress-fill-orange"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <p className="game-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>
        <p className="rebuttal-title">
          Floor is open
          <br />
          for discussions
        </p>

        <FloatingAvatarField
          heightClassName="rebuttal-avatar-field"
          phaseKey={`rebuttal:${room.roundIndex ?? 0}`}
          players={players}
        />

        {isHost ? (
          <Button
            className="btn-hold btn-phase rebuttal-hold-button"
            disabled={pendingAction === "advance-rebuttal"}
            holdingLabel="Keep holding..."
            interaction="hold"
            onHoldComplete={onAdvanceRebuttal}
          >
            {pendingAction === "advance-rebuttal" ? "Advancing..." : "Hold to end phase"}
          </Button>
        ) : (
          <p className="rebuttal-host-note">
            Host can advance the game
            <br />
            to the next phase
          </p>
        )}
      </div>
    </section>
  );
}
