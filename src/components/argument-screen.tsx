"use client";

import { useEffect, useMemo, useState } from "react";

import { FloatingAvatarField } from "@/components/floating-avatar-field";
import { HoldButton } from "@/components/hold-button";
import { buildPhaseViewModel } from "@/lib/in-game-ui";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";
import Image from "next/image";

type ArgumentScreenProps = {
  currentPlayer: PlayerDoc;
  noticeMessage: string | null;
  nowMs: number;
  onEndArgumentTurn: () => void;
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

export function ArgumentScreen({
  currentPlayer,
  noticeMessage,
  nowMs,
  onEndArgumentTurn,
  pendingAction,
  players,
  room,
  round,
  showDetails,
  statusMessage,
}: ArgumentScreenProps) {
  const viewModel = buildPhaseViewModel({
    room,
    round,
    currentPlayerId: currentPlayer.playerId,
    players,
    nowMs,
  });
  const speakingSide = room.activeArgumentSide;
  const nextSide =
    speakingSide === viewModel.argumentOrder[0]
      ? viewModel.argumentOrder[1]
      : viewModel.argumentOrder[0];
  const speakingPlayers = players.filter(
    (player) => round?.choicesByPlayer[player.playerId] === speakingSide,
  );
  const penalizedPlayer =
    players.find((player) => player.playerId === round?.penalizedPlayerId) ?? null;
  const selectedSide = round?.choicesByPlayer[currentPlayer.playerId] ?? null;
  const budgetSeconds = viewModel.activeSideBudgetSeconds ?? 120;
  const remainingPercent = Math.max(
    0,
    Math.min(
      100,
      ((viewModel.secondsRemaining ?? budgetSeconds) / Math.max(budgetSeconds, 1)) * 100,
    ),
  );

  const assignmentToast = useMemo(() => {
    if (!selectedSide || !round) {
      return null;
    }

    if ((round.forceAssignedPlayerIds ?? []).includes(currentPlayer.playerId)) {
      return {
        key: `${round.roundIndex}:force:${currentPlayer.playerId}`,
        message: `You're re-assigned to Side ${selectedSide}`,
      };
    }

    if ((round.autoAssignedPlayerIds ?? []).includes(currentPlayer.playerId)) {
      return {
        key: `${round.roundIndex}:auto:${currentPlayer.playerId}`,
        message: `You're assigned to Side ${selectedSide}`,
      };
    }

    return null;
  }, [currentPlayer.playerId, round, selectedSide]);

  const [dismissedToastKeys, setDismissedToastKeys] = useState<string[]>([]);
  const visibleToast =
    assignmentToast && !dismissedToastKeys.includes(assignmentToast.key) ? assignmentToast : null;

  useEffect(() => {
    if (!visibleToast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setDismissedToastKeys((current) =>
        current.includes(visibleToast.key) ? current : [...current, visibleToast.key],
      );
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [visibleToast]);

  const message = statusMessage ?? noticeMessage;

  return (
    <section className="argument-screen">
      <div className="argument-screen-shell toy-float">
        {visibleToast ? (
          <div className="argument-screen-toast" role="alert">
            <p className="argument-screen-toast-message">{visibleToast.message}</p>
            <button
              aria-label="Dismiss notification"
              className="argument-screen-toast-close"
              onClick={() =>
                setDismissedToastKeys((current) =>
                  current.includes(visibleToast.key) ? current : [...current, visibleToast.key],
                )
              }
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="toast-close-icon"
                height={24}
                src="/icons/close.svg"
                width={24}
              />
            </button>
          </div>
        ) : null}

        <div className="argument-screen-phase-header">
          <div className="argument-screen-phase-row">
            <p className="argument-screen-phase-label">
              Round {viewModel.roundNumber ?? "-"} / {viewModel.totalRounds}
            </p>
            <p className="argument-screen-phase-label">Argument</p>
          </div>

          <div className="argument-screen-timer-row">
            <div className="argument-screen-progress-track" aria-hidden="true">
              <div
                className="argument-screen-progress-fill"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <p className="argument-screen-timer">{formatTimer(viewModel.secondsRemaining)}</p>
          </div>
        </div>

        {message ? (
          <div
            className={`argument-screen-status ${statusMessage ? "argument-screen-status-error" : ""}`}
          >
            {message}
          </div>
        ) : null}

        <p className="argument-screen-speaking-title">
          Side {speakingSide ?? "A"} is speaking
        </p>

        {penalizedPlayer ? (
          <p className="argument-screen-penalty-copy">
            {penalizedPlayer.displayName.toUpperCase()} carries a 20s
            <br />
            dissenter penalty
          </p>
        ) : null}

        <FloatingAvatarField
          heightClassName="argument-screen-avatar-field"
          phaseKey={`argument:${room.roundIndex ?? 0}:${speakingSide ?? "A"}`}
          players={speakingPlayers}
        />

        <p className="argument-screen-next-up">Next up: Side {nextSide}</p>

        {viewModel.canEndArgumentTurn ? (
          <HoldButton
            className="argument-screen-hold-button"
            disabled={pendingAction === "end-turn"}
            holdingLabel="Keep holding..."
            idleLabel={pendingAction === "end-turn" ? "Ending turn..." : "Hold to end turn"}
            onHoldComplete={onEndArgumentTurn}
            progressClassName="argument-screen-hold-progress"
            size="lg"
            variant="secondary"
          />
        ) : null}

        {showDetails ? (
          <div className="argument-screen-details">
            <div className="argument-screen-detail-card">
              <p className="argument-screen-detail-label">You</p>
              <p className="argument-screen-detail-value">
                {selectedSide ? `Side ${selectedSide}` : "Waiting"}
              </p>
            </div>
            <div className="argument-screen-detail-card">
              <p className="argument-screen-detail-label">Speaking roster</p>
              <p className="argument-screen-detail-value">
                {speakingPlayers.map((player) => player.displayName).join(", ") || "Nobody"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
