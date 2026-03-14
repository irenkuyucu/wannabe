import type { CSSProperties } from "react";

import { getAvatarOption, getAvatarStyle } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";

type FloatingAvatarFieldProps = {
  heightClassName?: string;
  phaseKey: string;
  players: PlayerDoc[];
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number) {
  return (seed % 10000) / 10000;
}

function getBoundedPosition(seed: number, axis: "x" | "y", totalPlayers: number) {
  const densityOffset = Math.min(totalPlayers, 6) * 1.2;

  if (axis === "x") {
    const min = 18;
    const max = 82;
    return min + seededUnit(seed) * (max - min);
  }

  const min = 18;
  const max = totalPlayers <= 2 ? 60 : totalPlayers === 3 ? 67 : 74 - densityOffset;
  return min + seededUnit(seed) * Math.max(max - min, 18);
}

export function FloatingAvatarField({
  heightClassName,
  phaseKey,
  players,
}: FloatingAvatarFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={`floating-avatar-field ${heightClassName ?? ""}`.trim()}
    >
      {players.map((player, index) => {
        const avatar = getAvatarOption(player.avatarId);
        const seed = hashSeed(`${phaseKey}:${player.playerId}:${index}`);
        const left = getBoundedPosition(seed, "x", players.length);
        const top = getBoundedPosition(seed >> 4, "y", players.length);
        const driftX = (seededUnit(seed >> 7) * 1.8 - 0.9).toFixed(3);
        const driftY = (seededUnit(seed >> 11) * 1.6 - 0.8).toFixed(3);
        const duration = (12 + seededUnit(seed >> 13) * 7).toFixed(2);
        const delay = (seededUnit(seed >> 17) * -8).toFixed(2);
        const bobDuration = (5 + seededUnit(seed >> 19) * 3.2).toFixed(2);

        return (
          <div
            className="floating-avatar"
            key={player.playerId}
            style={
              {
                "--floating-avatar-left": `${left}%`,
                "--floating-avatar-top": `${top}%`,
                "--floating-avatar-drift-x": `${driftX}rem`,
                "--floating-avatar-drift-y": `${driftY}rem`,
                "--floating-avatar-duration": `${duration}s`,
                "--floating-avatar-delay": `${delay}s`,
                "--floating-avatar-bob-duration": `${bobDuration}s`,
              } as CSSProperties
            }
          >
            <div className="floating-avatar-bob">
              <div
                className="avatar-orb floating-avatar-orb flex items-center justify-center rounded-full"
                style={getAvatarStyle(avatar)}
              >
                <span className="floating-avatar-emoji">{avatar.emoji}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
