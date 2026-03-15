import { AvatarArt } from "@/components/avatar-art";
import type { AvatarOption } from "@/lib/avatar-options";

type EntryAvatarProps = {
  avatar: AvatarOption;
  onChoose: () => void;
};

export function EntryAvatar({ avatar, onChoose }: EntryAvatarProps) {
  return (
    <div className="entry-avatar-scene">
      <button
        aria-label={`Choose avatar. Current selection is ${avatar.label}.`}
        className="entry-avatar-trigger"
        onClick={onChoose}
        type="button"
      >
        <span className="entry-avatar-surface">
          <AvatarArt
            avatar={avatar}
            className="entry-avatar-image"
            decorative
            priority
          />
        </span>
      </button>
      <p className="entry-avatar-caption">Tap to choose your avatar</p>
    </div>
  );
}
