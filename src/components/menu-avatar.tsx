import { AvatarArt } from "@/components/avatar-art";
import type { AvatarOption } from "@/lib/avatar-options";

type MenuAvatarProps = {
  avatar: AvatarOption;
  onChoose: () => void;
};

export function MenuAvatar({ avatar, onChoose }: MenuAvatarProps) {
  return (
    <div className="menu-avatar-scene">
      <button
        aria-label={`Choose avatar. Current selection is ${avatar.label}.`}
        className="menu-avatar-trigger"
        onClick={onChoose}
        type="button"
      >
        <span className="menu-avatar-surface">
          <AvatarArt
            avatar={avatar}
            className="menu-avatar-image"
            decorative
            priority
          />
        </span>
      </button>
    </div>
  );
}
