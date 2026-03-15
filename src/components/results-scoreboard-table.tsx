import { AvatarArt } from "@/components/avatar-art";
import { getAvatarOption } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";

type ScoreboardEntry = {
  playerId: string;
  displayName: string;
  score: number;
  scoreDelta: number;
  isDissenter: boolean;
};

type ResultsScoreboardTableProps = {
  entries: ScoreboardEntry[];
  hostPlayerId?: string | null;
  players: PlayerDoc[];
  showRoundColumn: boolean;
};

function formatRoundDelta(scoreDelta: number) {
  return scoreDelta > 0 ? `+${scoreDelta}` : "-";
}

export function ResultsScoreboardTable({
  entries,
  hostPlayerId = null,
  players,
  showRoundColumn,
}: ResultsScoreboardTableProps) {
  return (
    <div className="results-scoreboard">
      <div
        className={`results-scoreboard-header ${showRoundColumn ? "results-scoreboard-header-round" : ""}`}
      >
        <p className="results-scoreboard-heading results-scoreboard-heading-player">Player</p>
        {showRoundColumn ? (
          <p className="results-scoreboard-heading results-scoreboard-heading-round">Round</p>
        ) : null}
        <p className="results-scoreboard-heading results-scoreboard-heading-total">Total</p>
      </div>

      <div className="results-scoreboard-rows">
        {entries.map((entry) => {
          const avatar = getAvatarOption(
            players.find((player) => player.playerId === entry.playerId)?.avatarId,
          );

          return (
            <div
              className={`results-scoreboard-row ${showRoundColumn ? "results-scoreboard-row-round" : ""}`}
              key={entry.playerId}
            >
              <div className="results-scoreboard-player">
                <div
                  className="results-scoreboard-avatar"
                >
                  <AvatarArt avatar={avatar} className="avatar-image" decorative />
                </div>
                <div className="results-scoreboard-name-block">
                  <div className="results-scoreboard-name-row">
                    <p className="results-scoreboard-name">
                      {entry.displayName}
                      {entry.playerId === hostPlayerId ? " (Host)" : ""}
                    </p>
                    {entry.isDissenter ? (
                      <span className="results-scoreboard-dissenter">Dissenter</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {showRoundColumn ? (
                <p className="results-scoreboard-value results-scoreboard-value-round">
                  {formatRoundDelta(entry.scoreDelta)}
                </p>
              ) : null}
              <p className="results-scoreboard-value results-scoreboard-value-total">
                {entry.score}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
