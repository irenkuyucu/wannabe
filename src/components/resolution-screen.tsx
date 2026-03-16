"use client";

import { HoldButton } from "@/components/hold-button";
import { ResultsScoreboardTable } from "@/components/results-scoreboard-table";
import { buildResolutionSummary } from "@/lib/session-summary";
import type { PlayerDoc, RoomDoc, RoundDoc } from "@/lib/firebase-client";

type ResolutionScreenProps = {
  currentPlayer: PlayerDoc;
  onAdvanceResolution: () => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
  round: RoundDoc | null;
};

function getResolutionTitle(summary: ReturnType<typeof buildResolutionSummary>) {
  if (summary.dissenterPlayer) {
    return "Dissenter!";
  }

  if (summary.outcome === "A_WON") {
    return "Side A wins the round";
  }

  if (summary.outcome === "B_WON") {
    return "Side B wins the round";
  }

  return "The round ends in a draw";
}

function getResolutionSubtitle(summary: ReturnType<typeof buildResolutionSummary>) {
  if (!summary.dissenterPlayer) {
    return null;
  }

  const outcomeLabel =
    summary.outcome === "A_WON"
      ? "Side A won"
      : summary.outcome === "B_WON"
        ? "Side B won"
        : "the round was a draw";

  return `The group agreed ${outcomeLabel}, but ${summary.dissenterPlayer.displayName} voted otherwise`;
}

export function ResolutionScreen({
  currentPlayer,
  onAdvanceResolution,
  pendingAction,
  players,
  room,
  round,
}: ResolutionScreenProps) {
  const summary = buildResolutionSummary({ room, round, players });
  const isHost = currentPlayer.playerId === room.hostPlayerId;
  const subtitle = getResolutionSubtitle(summary);

  return (
    <section className="resolution-screen">
      <div className="resolution-screen-shell toy-float">
        <div className="resolution-screen-phase-row">
          <p className="resolution-screen-phase-label">
            Round {(room.roundIndex ?? 0) + 1} / {room.roundsTotal}
          </p>
          <p className="resolution-screen-phase-label">Resolution</p>
        </div>
        <p className="resolution-screen-title">{getResolutionTitle(summary)}</p>
        {subtitle ? <p className="resolution-screen-subtitle">{subtitle}</p> : null}

        <ResultsScoreboardTable
          entries={summary.scoreboard}
          hostPlayerId={room.hostPlayerId}
          players={players}
          showRoundColumn
        />

        {isHost ? (
          <HoldButton
            className="resolution-screen-hold-button"
            disabled={pendingAction === "advance-resolution"}
            holdingLabel="Keep holding..."
            idleLabel={
              pendingAction === "advance-resolution"
                ? "Advancing..."
                : "Hold for next round"
            }
            onHoldComplete={onAdvanceResolution}
            progressClassName="resolution-screen-hold-progress"
            size="lg"
            variant="secondary"
          />
        ) : (
          <p className="resolution-screen-host-note">
            Host will advance the game
            <br />
            to the next round
          </p>
        )}
      </div>
    </section>
  );
}
