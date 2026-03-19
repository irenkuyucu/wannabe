import { bangers } from "@/app/fonts";
import { Toast } from "@/components/toast";
import { AvatarPickerModal } from "@/components/avatar-picker-modal";
import { EntryAvatar } from "@/components/entry-avatar";
import type { AvatarOption } from "@/lib/avatar-options";
import Image from "next/image";

type MenuScreenProps = {
  authError: string | null;
  createDisabled: boolean;
  createPending: boolean;
  displayName: string;
  errorMessage: string | null;
  inviteRoomCode?: string | null;
  isAvatarPickerOpen: boolean;
  joinCode: string;
  joinDisabled: boolean;
  joinPending: boolean;
  onAvatarPickerClose: () => void;
  onAvatarPickerOpen: () => void;
  onAvatarSelect: (avatarId: string) => void;
  onDismissStatusToast: () => void;
  onDismissValidationNotice: () => void;
  onCreateRoom: () => void;
  onDisplayNameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onJoinRoom: () => void;
  selectedAvatar: AvatarOption;
  validationNotice: string | null;
};

export function MenuScreen({
  authError,
  createDisabled,
  createPending,
  displayName,
  errorMessage,
  inviteRoomCode = null,
  isAvatarPickerOpen,
  joinCode,
  joinDisabled,
  joinPending,
  onAvatarPickerClose,
  onAvatarPickerOpen,
  onAvatarSelect,
  onDismissStatusToast,
  onDismissValidationNotice,
  onCreateRoom,
  onDisplayNameChange,
  onJoinCodeChange,
  onJoinRoom,
  selectedAvatar,
  validationNotice,
}: MenuScreenProps) {
  const errorToastMessage = (errorMessage ?? authError)?.replace(/\.$/, "") ?? null;
  const isInviteMode = Boolean(inviteRoomCode);

  return (
    <section className="menu-screen">
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={onAvatarPickerClose}
        onSelect={(avatarId) => {
          onAvatarSelect(avatarId);
          onAvatarPickerClose();
        }}
        selectedAvatarId={selectedAvatar.id}
      />
      <div className="menu-screen-shell toy-float">
        {validationNotice || errorToastMessage ? (
          <div className="toast-stack" aria-live="polite">
            {validationNotice ? (
              <Toast
                closeLabel="Dismiss notification"
                message={validationNotice}
                onDismiss={onDismissValidationNotice}
                variant="error"
              />
            ) : null}

            {errorToastMessage ? (
              <Toast
                closeLabel="Dismiss error"
                message={errorToastMessage}
                onDismiss={onDismissStatusToast}
                variant="error"
              />
            ) : null}
          </div>
        ) : null}

        <h1 className={`${bangers.className} menu-screen-logo`} style={bangers.style}>
          Wannabe!
        </h1>
        {isInviteMode ? (
          <p className="menu-invite-copy">
            <span>You&apos;re invited to join</span>
            <span>Room {inviteRoomCode}</span>
          </p>
        ) : null}
        <p className="menu-screen-tagline">
          Be someone!
        </p>

        <EntryAvatar avatar={selectedAvatar} onChoose={onAvatarPickerOpen} />

        <label className="sr-only" htmlFor="display-name">
          Display name
        </label>
        <input
          className="menu-screen-input"
          id="display-name"
          maxLength={12}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Enter your name"
          value={displayName}
        />

        {isInviteMode ? (
          <button
            className="menu-screen-create-button menu-screen-invite-button"
            disabled={joinDisabled}
            onClick={onJoinRoom}
            type="button"
          >
            {joinPending ? "Joining..." : "Join your friends"}
          </button>
        ) : (
          <>
            <div className="menu-screen-copy">
              <p>Have a code? Enter below</p>
              <p>to join your friends:</p>
            </div>

            <div className="menu-screen-code-row">
              <label className="sr-only" htmlFor="room-code">
                Room code
              </label>
              <input
                className="menu-screen-input menu-screen-code-input"
                id="room-code"
                inputMode="numeric"
                onChange={(event) => onJoinCodeChange(event.target.value)}
                placeholder="ROOM CODE"
                value={joinCode}
              />
              <button
                aria-label={joinPending ? "Joining room" : "Join room"}
                className="menu-screen-join-button"
                disabled={joinDisabled}
                onClick={onJoinRoom}
                type="button"
              >
                {joinPending ? (
                  <span className="menu-screen-join-pending">...</span>
                ) : (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="menu-screen-arrow-icon"
                    height={28}
                    src="/icons/right-arrow.svg"
                    width={28}
                  />
                )}
              </button>
            </div>

            <div className="menu-screen-copy menu-screen-copy-create">
              <p>No code? No problem.</p>
              <p>Create a new room below:</p>
            </div>

            <button
              className="menu-screen-create-button"
              disabled={createDisabled}
              onClick={onCreateRoom}
              type="button"
            >
              {createPending ? "Creating..." : "Create room"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
