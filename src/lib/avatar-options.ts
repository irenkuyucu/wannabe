import type { CSSProperties } from "react";

export type AvatarOption = {
  id: string;
  emoji: string;
  from: string;
  to: string;
  border: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "spark", emoji: "⚡", from: "#59efff", to: "#4d8cff", border: "#7ae5ff" },
  { id: "crown", emoji: "👑", from: "#ffe86b", to: "#ffae22", border: "#ffe46e" },
  { id: "party", emoji: "🎉", from: "#ff8be5", to: "#b55dff", border: "#ff9ef0" },
  { id: "rocket", emoji: "🚀", from: "#91ff6a", to: "#35d91c", border: "#a7ff84" },
  { id: "mask", emoji: "🎭", from: "#4df2d0", to: "#288fd9", border: "#84fff0" },
  { id: "dice", emoji: "🎲", from: "#ffd86e", to: "#ff7d3a", border: "#ffdc94" },
];

export function getAvatarOption(avatarId: string | null | undefined) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId) ?? AVATAR_OPTIONS[0];
}

export function getAvatarStyle(avatar: AvatarOption): CSSProperties {
  return {
    backgroundImage: `linear-gradient(180deg, ${avatar.from}, ${avatar.to})`,
    borderColor: avatar.border,
  };
}
