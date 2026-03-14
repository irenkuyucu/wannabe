import { bangers } from "@/app/fonts";
import { EntryAvatar } from "@/components/entry-avatar";
import Image from "next/image";

type EntryScreenProps = {
  authError: string | null;
  authReady: boolean;
  createDisabled: boolean;
  createPending: boolean;
  displayName: string;
  errorMessage: string | null;
  inviteRoomCode?: string | null;
  joinCode: string;
  joinDisabled: boolean;
  joinPending: boolean;
  noticeMessage: string | null;
  onDismissValidationNotice: () => void;
  onCreateRoom: () => void;
  onDisplayNameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onJoinRoom: () => void;
  validationNotice: string | null;
};

export function EntryScreen({
  authError,
  authReady,
  createDisabled,
  createPending,
  displayName,
  errorMessage,
  inviteRoomCode = null,
  joinCode,
  joinDisabled,
  joinPending,
  noticeMessage,
  onDismissValidationNotice,
  onCreateRoom,
  onDisplayNameChange,
  onJoinCodeChange,
  onJoinRoom,
  validationNotice,
}: EntryScreenProps) {
  const statusMessage =
    errorMessage ?? authError ?? noticeMessage ?? (authReady ? null : "Connecting...");
  const isInviteMode = Boolean(inviteRoomCode);

  return (
    <section className="entry-screen">
      <div className="entry-screen-shell toy-float">
        {validationNotice ? (
          <div className="entry-screen-toast" role="alert">
            <p className="entry-screen-toast-message">{validationNotice}</p>
            <button
              aria-label="Dismiss notification"
              className="entry-screen-toast-close"
              onClick={onDismissValidationNotice}
              type="button"
            >
              ×
            </button>
          </div>
        ) : null}

        <h1 className={`${bangers.className} entry-screen-logo`} style={bangers.style}>
          Wannabe!
        </h1>
        {isInviteMode ? (
          <p className="entry-screen-invite-copy">
            <span>You&apos;re invited to join</span>
            <span>Room {inviteRoomCode}</span>
          </p>
        ) : null}
        <p className={`entry-screen-tagline ${isInviteMode ? "entry-screen-tagline-invite" : ""}`}>
          Be someone!
        </p>

        <EntryAvatar />

        <label className="sr-only" htmlFor="display-name">
          Display name
        </label>
        <input
          className="entry-screen-input"
          id="display-name"
          maxLength={16}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Enter your name"
          value={displayName}
        />

        {isInviteMode ? (
          <button
            className="entry-screen-create-button entry-screen-invite-button"
            disabled={joinDisabled}
            onClick={onJoinRoom}
            type="button"
          >
            {joinPending ? "Joining..." : "Join your friends"}
          </button>
        ) : (
          <>
            <div className="entry-screen-copy">
              <p>Have a code? Enter below</p>
              <p>to join your friends:</p>
            </div>

            <div className="entry-screen-code-row">
              <label className="sr-only" htmlFor="room-code">
                Room code
              </label>
              <input
                className="entry-screen-input entry-screen-code-input"
                id="room-code"
                inputMode="numeric"
                onChange={(event) => onJoinCodeChange(event.target.value)}
                placeholder="ROOM CODE"
                value={joinCode}
              />
              <button
                aria-label={joinPending ? "Joining room" : "Join room"}
                className="entry-screen-join-button"
                disabled={joinDisabled}
                onClick={onJoinRoom}
                type="button"
              >
                {joinPending ? (
                  <span className="entry-screen-join-pending">...</span>
                ) : (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="entry-screen-arrow-icon"
                    height={28}
                    src="/icons/right-arrow.svg"
                    width={28}
                  />
                )}
              </button>
            </div>

            <div className="entry-screen-copy entry-screen-copy-create">
              <p>No code? No problem.</p>
              <p>Create a new room below:</p>
            </div>

            <button
              className="entry-screen-create-button"
              disabled={createDisabled}
              onClick={onCreateRoom}
              type="button"
            >
              {createPending ? "Creating..." : "Create room"}
            </button>
          </>
        )}

        {statusMessage ? (
          <div
            className={`entry-screen-status ${errorMessage || authError ? "entry-screen-status-error" : ""}`}
          >
            {statusMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
