"use client";

import { AvatarArt } from "@/components/avatar-art";
import { getAvatarOption } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";
import { formatVerdictLabel } from "@/lib/session-summary";

type ScoreboardEntry = {
  playerId: string;
  displayName: string;
  score: number;
  choice: "A" | "B" | null;
  verdict: "A_WON" | "B_WON" | "DRAW" | "ABSTAIN" | null;
  scoreDelta: number;
  wasForceAssigned: boolean;
  isBonusEligible: boolean;
  isDissenter: boolean;
  rank: number;
};

type SessionScoreboardProps = {
  currentPlayerId?: string | null;
  entries: ScoreboardEntry[];
  players: PlayerDoc[];
  showRoundMeta?: boolean;
};

function getEntryAvatar(players: PlayerDoc[], playerId: string) {
  const avatarId = players.find((player) => player.playerId === playerId)?.avatarId;
  return getAvatarOption(avatarId);
}

export function SessionScoreboard({
  currentPlayerId = null,
  entries,
  players,
  showRoundMeta = false,
}: SessionScoreboardProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#d8ecff]">No players are available for this scoreboard.</p>;
  }

  return (
    <div className="grid gap-3">
      {entries.map((entry) => {
        const avatar = getEntryAvatar(players, entry.playerId);
        const roundMeta = [
          entry.choice ? `Choice ${entry.choice}` : null,
          showRoundMeta && entry.verdict ? `Verdict ${formatVerdictLabel(entry.verdict)}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const highlightTone =
          entry.scoreDelta > 0
            ? "bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]"
            : "bg-[#103f8f] text-white";

        return (
          <div
            className="toy-list-row flex flex-col gap-3 rounded-[1.2rem] px-3.5 py-3 sm:flex-row sm:items-center"
            key={entry.playerId}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className="avatar-orb flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
              >
                <AvatarArt avatar={avatar} className="avatar-image" decorative />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-black uppercase text-white">
                    {entry.displayName}
                  </p>
                  <span className="score-pill text-white">#{entry.rank}</span>
                  {entry.playerId === currentPlayerId ? (
                    <span className="hud-pill bg-[#59efff] text-[#14356b]">You</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#d9eeff]">
                  {roundMeta || "Final session score"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.isBonusEligible ? (
                    <span className="hud-pill bg-[#ffd74b] text-[#6c4400]">Lone-side bonus</span>
                  ) : null}
                  {entry.wasForceAssigned ? (
                    <span className="hud-pill bg-[#ff8be5] text-[#6d1676]">Force assigned</span>
                  ) : null}
                  {entry.isDissenter ? (
                    <span className="hud-pill bg-white text-[#14356b]">Dissenter</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {showRoundMeta ? (
                <span className={`hud-pill ${highlightTone}`}>
                  {entry.scoreDelta > 0 ? `+${entry.scoreDelta} this round` : "No round points"}
                </span>
              ) : null}
              <span className="phase-timer-bubble min-w-[5.75rem] px-3 py-2.5">
                <span className="block text-xs uppercase tracking-[0.16em] text-[#d9eeff]">
                  Score
                </span>
                <span className="mt-1 block text-xl font-black uppercase text-white">
                  {entry.score}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
