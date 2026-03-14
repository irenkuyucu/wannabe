"use client";

import { FloatingAvatarField } from "@/components/floating-avatar-field";
import { HoldButton } from "@/components/hold-button";
import { buildPhaseViewModel } from "@/lib/in-game-ui";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type RebuttalScreenProps = {
  currentPlayer: PlayerDoc;
  noticeMessage: string | null;
  nowMs: number;
  onAdvanceRebuttal: () => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
  showDetails: boolean;
  statusMessage: string | null;
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
  noticeMessage,
  nowMs,
  onAdvanceRebuttal,
  pendingAction,
  players,
  room,
  round,
  showDetails,
  statusMessage,
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
  const message = statusMessage ?? noticeMessage;

  return (
    <section className="rebuttal-screen">
      <div className="rebuttal-screen-shell toy-float">
        <div className="rebuttal-screen-phase-header">
          <div className="rebuttal-screen-phase-row">
            <p className="rebuttal-screen-phase-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="rebuttal-screen-phase-label">Rebuttal</p>
          </div>

          <div className="rebuttal-screen-timer-row">
            <div className="rebuttal-screen-progress-track" aria-hidden="true">
              <div
                className="rebuttal-screen-progress-fill"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <p className="rebuttal-screen-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>

        {message ? (
          <div
            className={`rebuttal-screen-status ${statusMessage ? "rebuttal-screen-status-error" : ""}`}
          >
            {message}
          </div>
        ) : null}

        <p className="rebuttal-screen-title">
          Floor is open
          <br />
          for discussions
        </p>

        <FloatingAvatarField
          heightClassName="rebuttal-screen-avatar-field"
          phaseKey={`rebuttal:${room.roundIndex ?? 0}`}
          players={players}
        />

        {isHost ? (
          <HoldButton
            className="rebuttal-screen-hold-button"
            disabled={pendingAction === "advance-rebuttal"}
            holdingLabel="Keep holding..."
            idleLabel={pendingAction === "advance-rebuttal" ? "Advancing..." : "Hold to end phase"}
            onHoldComplete={onAdvanceRebuttal}
            progressClassName="rebuttal-screen-hold-progress"
            size="lg"
            variant="secondary"
          />
        ) : (
          <p className="rebuttal-screen-host-note">
            Host can advance the game
            <br />
            to the next phase
          </p>
        )}

        {showDetails ? (
          <div className="rebuttal-screen-details">
            <div className="rebuttal-screen-detail-card">
              <p className="rebuttal-screen-detail-label">Players</p>
              <p className="rebuttal-screen-detail-value">{players.length}</p>
            </div>
            <div className="rebuttal-screen-detail-card">
              <p className="rebuttal-screen-detail-label">Host</p>
              <p className="rebuttal-screen-detail-value">
                {players.find((player) => player.playerId === room.hostPlayerId)?.displayName ?? "Unknown"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
