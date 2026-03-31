"use client";

import { AvatarArt } from "@/components/avatar-art";
import { ModalShell } from "@/components/ui/modal-shell";
import { AVATAR_OPTIONS } from "@/lib/avatar-options";

type AvatarPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  selectedAvatarId: string;
};

export function AvatarPickerModal({
  isOpen,
  onClose,
  onSelect,
  selectedAvatarId,
}: AvatarPickerModalProps) {
  return (
    <ModalShell
      bodyClassName="avatar-picker-body"
      closeLabel="Close avatar picker"
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="surface-enter"
      title="Pick who you want to be."
    >
      <div className="avatar-picker-grid">
        {AVATAR_OPTIONS.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;
          return (
            <button
              aria-label={`Select ${avatar.label}`}
              aria-pressed={isSelected}
              className={`avatar-choice ${isSelected ? "avatar-choice-active" : ""}`}
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              type="button"
            >
              <span className="avatar-choice-surface">
                <AvatarArt
                  avatar={avatar}
                  className="avatar-choice-image"
                  decorative
                />
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
