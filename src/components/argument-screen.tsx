"use client";

import { useEffect, useMemo, useState } from "react";

import { AppToast } from "@/components/app-toast";
import { FloatingAvatarField } from "@/components/floating-avatar-field";
import { Button } from "@/components/ui/button";
import { buildPhaseViewModel } from "@/lib/in-game-ui";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type ArgumentScreenProps = {
  currentPlayer: PlayerDoc;
  nowMs: number;
  onEndArgumentTurn: () => void;
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

export function ArgumentScreen({
  currentPlayer,
  nowMs,
  onEndArgumentTurn,
  pendingAction,
  players,
  room,
  round,
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

  return (
    <section className="argument-screen">
      <div className="argument-screen-shell toy-float">
        {visibleToast ? (
          <AppToast
            className="app-toast-fixed"
            closeLabel="Dismiss notification"
            message={visibleToast.message}
            onDismiss={() =>
              setDismissedToastKeys((current) =>
                current.includes(visibleToast.key) ? current : [...current, visibleToast.key],
              )
            }
            variant="warning"
          />
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
          <Button
            className="argument-screen-hold-button"
            disabled={pendingAction === "end-turn"}
            holdingLabel="Keep holding..."
            interaction="hold"
            onHoldComplete={onEndArgumentTurn}
            size="phase"
            variant="hold"
          >
            {pendingAction === "end-turn" ? "Ending turn..." : "Hold to end turn"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
