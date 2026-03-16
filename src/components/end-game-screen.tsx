"use client";

import { bangers } from "@/app/fonts";
import { AvatarArt } from "@/components/avatar-art";
import { ResultsScoreboardTable } from "@/components/results-scoreboard-table";
import { getAvatarOption } from "@/lib/avatar-options";
import { buildGameOverSummary } from "@/lib/session-summary";
import type { PlayerDoc, RoundDoc, RoomDoc } from "@/lib/firebase-client";

type EndGameScreenProps = {
  latestRound: RoundDoc | null;
  onReturnToMain: () => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  room: RoomDoc;
};

function formatWinnerNames(names: string[]) {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function EndGameScreen({
  latestRound,
  onReturnToMain,
  pendingAction,
  players,
  room,
}: EndGameScreenProps) {
  const summary = buildGameOverSummary(players, latestRound);
  const winnerNames = summary.winners.map((winner) => winner.displayName);
  const headline =
    summary.winners.length === 1
      ? `${winnerNames[0]} wins the game!`
      : `${formatWinnerNames(winnerNames)} win the game!`;

  return (
    <section className="end-game-screen">
      <div className="end-game-screen-shell toy-float">
        <h1 className={`${bangers.className} end-game-screen-logo`} style={bangers.style}>
          Winner winner!
        </h1>

        <div
          className={`end-game-screen-winners ${summary.winners.length > 1 ? "end-game-screen-winners-multi" : ""}`}
        >
          {summary.winners.map((winner) => {
            const avatar = getAvatarOption(
              players.find((player) => player.playerId === winner.playerId)?.avatarId,
            );
            return (
              <div className="end-game-screen-winner-avatar-wrap" key={winner.playerId}>
                <span className="end-game-screen-crown" aria-hidden="true">
                  👑
                </span>
                <div className="end-game-screen-winner-avatar">
                  <AvatarArt avatar={avatar} className="avatar-image" decorative />
                </div>
              </div>
            );
          })}
        </div>

        <p className="end-game-screen-headline">{headline}</p>
        <ResultsScoreboardTable
          entries={summary.scoreboard}
          hostPlayerId={room.hostPlayerId}
          players={players}
          showRoundColumn={false}
        />

        <button
          className="end-game-screen-return-button"
          disabled={pendingAction === "advance-resolution"}
          onClick={onReturnToMain}
          type="button"
        >
          {pendingAction === "advance-resolution" ? "Returning..." : "Return to main menu"}
        </button>
      </div>
    </section>
  );
}
