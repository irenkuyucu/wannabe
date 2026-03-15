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
    <div className="flex min-h-[320px] flex-col gap-[16px] rounded-[24px] bg-[#082f76] px-[16px] py-[16px] ring-1 ring-white/10 sm:px-[20px] sm:py-[20px] lg:min-h-[384px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <p className="section-banner bg-linear-to-r from-[#ff8be5] to-[#b55dff] text-white">
          Game over
        </p>
        <span className="score-pill text-white">Room {room.roomCode}</span>
      </div>

      <div className="phase-hero-card">
        <div className="flex flex-wrap items-start justify-between gap-[16px]">
          <div className="max-w-3xl">
            <p className="text-[14px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
              Session complete
            </p>
            <h2 className="mt-[12px] text-[clamp(25.6px,2.2vw,40px)] font-black uppercase tracking-[-0.04em] text-white">
              {summary.headline}
            </h2>
            <p className="mt-[12px] max-w-2xl text-[14px] leading-[24px] text-[#d8ecff] sm:text-[16px] sm:leading-[28px]">
              {summary.supportingText} The room stays readable for a short window but cannot be
              rejoined.
            </p>
          </div>
          <div className="toy-chip-panel rounded-[22.4px] px-[16px] py-[16px]">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
              Final round
            </p>
            <p className="mt-[8px] text-[20px] font-black uppercase text-white">
              {latestRound ? formatOutcomeLabel(latestRound.outcome) : "Complete"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-[16px] lg:grid-cols-[1fr_1.08fr]">
        <div className="phase-roster">
          <p className="text-[14px] font-black uppercase text-white">Ended room message</p>
          <p className="mt-[12px] text-[14px] leading-[28px] text-[#d8ecff]">
            This game session is finished. Return to main to start or join a different room. The
            old room is ended and cannot resume.
          </p>
          <div className="mt-[16px]">
            <Button onClick={onReturnToMain} size="lg" variant="secondary">
              Return to main
            </Button>
          </div>
        </div>

        <div className="phase-roster">
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <p className="text-[14px] font-black uppercase text-white">Final scoreboard</p>
            <span className="score-pill text-white">
              {summary.winners.length === 1 ? "Single winner" : "Tie allowed"}
            </span>
          </div>
          <div className="mt-[16px]">
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
