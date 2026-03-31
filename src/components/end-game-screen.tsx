"use client";

import { bangers } from "@/app/fonts";
import { AvatarArt } from "@/components/avatar-art";
import { Scoreboard } from "@/components/scoreboard";
import { Button } from "@/components/ui/button";
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
    <section className="game-screen game-screen-wide endgame">
      <div className="game-screen-shell game-screen-shell-wide surface-enter">
        <h1 className={`${bangers.className} logo logo-lg endgame-logo`} style={bangers.style}>
          Winner winner!
        </h1>

        <div
          className={`endgame-winners ${summary.winners.length > 1 ? "endgame-winners-multi" : ""}`}
        >
          {summary.winners.map((winner) => {
            const avatar = getAvatarOption(
              players.find((player) => player.playerId === winner.playerId)?.avatarId,
            );
            return (
              <div className="endgame-winner-avatar-wrap" key={winner.playerId}>
                <span className="endgame-crown" aria-hidden="true">
                  👑
                </span>
                <div className="avatar-frame avatar-md endgame-winner-avatar">
                  <AvatarArt avatar={avatar} className="avatar-image" decorative />
                </div>
              </div>
            );
          })}
        </div>

        <p className="endgame-headline">{headline}</p>
        <Scoreboard
          entries={summary.scoreboard}
          hostPlayerId={room.hostPlayerId}
          players={players}
          showRoundColumn={false}
        />

        <Button
          className="btn-hold btn-phase endgame-return-button"
          disabled={pendingAction === "advance-resolution"}
          onClick={onReturnToMain}
        >
          {pendingAction === "advance-resolution" ? "Returning..." : "Return to main menu"}
        </Button>
      </div>
    </section>
  );
}
