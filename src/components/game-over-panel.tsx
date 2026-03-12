"use client";

import { Button } from "@/components/ui/button";
import type { PlayerDoc, RoundDoc, RoomDoc } from "@/lib/firebase-client";
import { buildGameOverSummary, formatOutcomeLabel } from "@/lib/session-summary";
import { SessionScoreboard } from "@/components/session-scoreboard";

type GameOverPanelProps = {
  currentPlayerId?: string | null;
  latestRound: RoundDoc | null;
  onReturnToMain: () => void;
  players: PlayerDoc[];
  room: RoomDoc;
};

export function GameOverPanel({
  currentPlayerId = null,
  latestRound,
  onReturnToMain,
  players,
  room,
}: GameOverPanelProps) {
  const summary = buildGameOverSummary(players, latestRound);

  return (
    <div className="flex min-h-[20rem] flex-col gap-4 rounded-[1.5rem] bg-[#082f76] px-4 py-4 ring-1 ring-white/10 sm:px-5 sm:py-5 lg:min-h-[24rem]">
      <div className="flex flex-wrap items-center gap-3">
        <p className="section-banner bg-linear-to-r from-[#ff8be5] to-[#b55dff] text-white">
          Game over
        </p>
        <span className="score-pill text-white">Room {room.roomCode}</span>
      </div>

      <div className="phase-hero-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
              Session complete
            </p>
            <h2 className="mt-3 text-[clamp(1.6rem,2.2vw,2.5rem)] font-black uppercase tracking-[-0.04em] text-white">
              {summary.headline}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8ecff] sm:text-base sm:leading-7">
              {summary.supportingText} The room stays readable for a short window but cannot be
              rejoined.
            </p>
          </div>
          <div className="toy-chip-panel rounded-[1.4rem] px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
              Final round
            </p>
            <p className="mt-2 text-xl font-black uppercase text-white">
              {latestRound ? formatOutcomeLabel(latestRound.outcome) : "Complete"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.08fr]">
        <div className="phase-roster">
          <p className="text-sm font-black uppercase text-white">Ended room message</p>
          <p className="mt-3 text-sm leading-7 text-[#d8ecff]">
            This game session is finished. Return to main to start or join a different room. The
            old room is ended and cannot resume.
          </p>
          <div className="mt-4">
            <Button onClick={onReturnToMain} size="lg" variant="secondary">
              Return to main
            </Button>
          </div>
        </div>

        <div className="phase-roster">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black uppercase text-white">Final scoreboard</p>
            <span className="score-pill text-white">
              {summary.winners.length === 1 ? "Single winner" : "Tie allowed"}
            </span>
          </div>
          <div className="mt-4">
            <SessionScoreboard
              currentPlayerId={currentPlayerId}
              entries={summary.scoreboard}
              players={players}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
