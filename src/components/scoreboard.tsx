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

type ScoreboardProps = {
  entries: ScoreboardEntry[];
  hostPlayerId?: string | null;
  players: PlayerDoc[];
  showRoundColumn: boolean;
};

function formatRoundDelta(scoreDelta: number) {
  return scoreDelta > 0 ? `+${scoreDelta}` : "-";
}

export function Scoreboard({
  entries,
  hostPlayerId = null,
  players,
  showRoundColumn,
}: ScoreboardProps) {
  return (
    <div className="scoreboard">
      <div
        className={`scoreboard-header ${showRoundColumn ? "scoreboard-header-round" : ""}`}
      >
        <p className="scoreboard-heading scoreboard-heading-player">Player</p>
        {showRoundColumn ? (
          <p className="scoreboard-heading scoreboard-heading-round">Round</p>
        ) : null}
        <p className="scoreboard-heading scoreboard-heading-total">Total</p>
      </div>

      <div className="scoreboard-rows">
        {entries.map((entry) => {
          const avatar = getAvatarOption(
            players.find((player) => player.playerId === entry.playerId)?.avatarId,
          );

          return (
            <div
              className={`scoreboard-row ${showRoundColumn ? "scoreboard-row-round" : ""}`}
              key={entry.playerId}
            >
              <div className="scoreboard-player">
                <div className="avatar-frame avatar-sm scoreboard-avatar">
                  <AvatarArt avatar={avatar} className="avatar-image" decorative />
                </div>
                <div className="scoreboard-name-block">
                  <div className="scoreboard-name-row">
                    <p className="scoreboard-name">
                      {entry.displayName}
                      {entry.playerId === hostPlayerId ? " (Host)" : ""}
                    </p>
                    {entry.isDissenter ? (
                      <span className="badge badge-red">Dissenter</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {showRoundColumn ? (
                <p className="scoreboard-value scoreboard-value-round">
                  {formatRoundDelta(entry.scoreDelta)}
                </p>
              ) : null}
              <p className="scoreboard-value scoreboard-value-total">
                {entry.score}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
