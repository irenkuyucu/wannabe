import { bangers } from "@/app/fonts";
import { Toast } from "@/components/toast";
import { AvatarPickerModal } from "@/components/avatar-picker-modal";
import { MenuAvatar } from "@/components/menu-avatar";
import { FieldActionButton, FieldInput, FieldShell } from "@/components/ui/field";
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
    <section className="menu">
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={onAvatarPickerClose}
        onSelect={(avatarId) => {
          onAvatarSelect(avatarId);
          onAvatarPickerClose();
        }}
        selectedAvatarId={selectedAvatar.id}
      />
      <div className="menu-shell surface-enter">
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

        <h1 className={`${bangers.className} logo logo-md`} style={bangers.style}>
          Wannabe!
        </h1>
        {isInviteMode ? (
          <p className="menu-invite-copy">
            <span>You&apos;re invited to join</span>
            <span>Room {inviteRoomCode}</span>
          </p>
        ) : null}
        <p className="menu-tagline">
          Be someone!
        </p>

        <MenuAvatar avatar={selectedAvatar} onChoose={onAvatarPickerOpen} />

        <label className="sr-only" htmlFor="display-name">
          Display name
        </label>
        <FieldInput
          id="display-name"
          maxLength={12}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Enter your name"
          value={displayName}
        />

        {isInviteMode ? (
          <button
            className="btn btn-primary btn-md menu-invite-button"
            disabled={joinDisabled}
            onClick={onJoinRoom}
            type="button"
          >
            {joinPending ? "Joining..." : "Join your friends"}
          </button>
        ) : (
          <>
            <div className="menu-copy">
              <p>Have a code? Enter below</p>
              <p>to join your friends:</p>
            </div>

            <FieldShell className="menu-code-row">
              <label className="sr-only" htmlFor="room-code">
                Room code
              </label>
              <FieldInput
                className="menu-code-input"
                embedded
                id="room-code"
                inputMode="numeric"
                onChange={(event) => onJoinCodeChange(event.target.value)}
                placeholder="ROOM CODE"
                value={joinCode}
              />
              <FieldActionButton
                aria-label={joinPending ? "Joining room" : "Join room"}
                className="menu-join-button"
                disabled={joinDisabled}
                onClick={onJoinRoom}
                type="button"
              >
                {joinPending ? (
                  <span className="menu-join-pending">...</span>
                ) : (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="menu-arrow-icon"
                    height={28}
                    src="/icons/right-arrow.svg"
                    width={28}
                  />
                )}
              </FieldActionButton>
            </FieldShell>

            <div className="menu-copy menu-copy-create">
              <p>No code? No problem.</p>
              <p>Create a new room below:</p>
            </div>

            <button
              className="btn btn-primary btn-md menu-create-button"
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
