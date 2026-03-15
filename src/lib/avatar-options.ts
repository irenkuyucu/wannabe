export type AvatarOption = {
  id: string;
  label: string;
  src: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = Array.from({ length: 25 }, (_, index) => {
  const avatarNumber = index + 1;
  return {
    id: `avatar-${avatarNumber}`,
    label: `Avatar ${avatarNumber}`,
    src: `/avatars/avatar-${avatarNumber}.svg`,
  };
});

export const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0].id;

export function getAvatarOption(avatarId: string | null | undefined) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId) ?? AVATAR_OPTIONS[0];
}
