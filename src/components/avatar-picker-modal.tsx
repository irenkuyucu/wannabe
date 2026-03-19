"use client";

import { useEffect } from "react";

import { AvatarArt } from "@/components/avatar-art";
import { AVATAR_OPTIONS } from "@/lib/avatar-options";
import Image from "next/image";

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
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="avatar-picker-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="avatar-picker-title"
        aria-modal="true"
        className="avatar-picker-panel toy-float"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="avatar-picker-header">
          <div>
            <h2 id="avatar-picker-title" className="avatar-picker-title">
              Pick who you want to be.
            </h2>
          </div>
          <button
            aria-label="Close avatar picker"
            className="avatar-picker-close"
            onClick={onClose}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="avatar-picker-close-icon"
              height={24}
              src="/icons/close.svg"
              style={{ filter: "brightness(0) invert(1)" }}
              width={24}
            />
          </button>
        </div>

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
      </div>
    </div>
  );
}
