import { bangers } from "@/app/fonts";
import { AvatarArt } from "@/components/avatar-art";
import { getAvatarOption, type AvatarOption } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";

type LobbyScreenProps = {
  copiedShareLink: boolean;
  currentPlayer: PlayerDoc | null;
  hostPlayerId: string | null;
  isLoading?: boolean;
  onCopyShareLink: () => void;
  onReadyToggle: () => void;
  onStartGame: () => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  roomCode: string;
  showStartButton: boolean;
  startDisabled: boolean;
};

function LobbyAvatar({ avatar }: { avatar: AvatarOption }) {
  return (
    <div className="avatar-frame avatar-sm lobby-avatar">
      <AvatarArt avatar={avatar} className="avatar-image" decorative />
    </div>
  );
}

export function LobbyScreen({
  copiedShareLink,
  currentPlayer,
  hostPlayerId,
  isLoading = false,
  onCopyShareLink,
  onReadyToggle,
  onStartGame,
  pendingAction,
  players,
  roomCode,
  showStartButton,
  startDisabled,
}: LobbyScreenProps) {
  const readyButtonLabel =
    pendingAction === "ready"
      ? "Updating..."
      : currentPlayer?.ready
        ? "Mark unready"
        : "Mark ready";

  const shareButtonLabel =
    pendingAction === "share-link"
      ? "Sharing..."
      : copiedShareLink
        ? "Copied"
        : "Share link";
  const loadingRowClasses = [
    "lobby-player-name-skeleton-long",
    "lobby-player-name-skeleton-medium",
    "lobby-player-name-skeleton-short",
  ];

  return (
    <section className="lobby">
      <div className="lobby-shell surface-enter">
        <h1 className={`${bangers.className} logo logo-md`} style={bangers.style}>
          Wannabe!
        </h1>
        <p className="lobby-room-code">Room {roomCode} Lobby</p>

        <div className="lobby-roster">
          {isLoading ? (
            <>
              {loadingRowClasses.map((nameWidthClass, index) => (
                <div
                  aria-hidden="true"
                  className="lobby-player-row lobby-player-row-skeleton skeleton-ghost"
                  key={nameWidthClass}
                >
                  <div className="lobby-player-main">
                    <div className="avatar-sm lobby-avatar-skeleton skeleton-ghost" />
                    <div className={`lobby-player-name-skeleton ${nameWidthClass} skeleton-ghost`} />
                  </div>
                  <div
                    className={`lobby-ready-pill-skeleton skeleton-ghost ${
                      index === 1 ? "lobby-ready-pill-skeleton-short" : ""
                    }`}
                  />
                </div>
              ))}
            </>
          ) : players.map((player) => {
            const avatar = getAvatarOption(player.avatarId);
            const isHost = player.playerId === hostPlayerId;
            return (
              <div className="lobby-player-row" key={player.playerId}>
                <div className="lobby-player-main">
                  <LobbyAvatar avatar={avatar} />
                  <p className="lobby-player-name">
                    {player.displayName}
                    {isHost ? " (Host)" : ""}
                  </p>
                </div>
                <span
                  className={`badge ${player.ready ? "badge-green" : "badge-pink"} lobby-ready-pill`}
                >
                  {player.ready ? "Ready" : "Not Ready"}
                </span>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <>
            <div className="lobby-actions-row" aria-hidden="true">
              <div className="btn btn-lg lobby-action-button lobby-action-button-skeleton skeleton-ghost" />
              <div className="btn btn-lg lobby-action-button lobby-action-button-skeleton skeleton-ghost" />
            </div>
            {showStartButton ? (
              <div
                aria-hidden="true"
                className="btn btn-lg lobby-start-button lobby-start-button-skeleton skeleton-ghost"
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="lobby-actions-row">
              <button
                className={`btn btn-lg ${currentPlayer?.ready ? "btn-unready" : "btn-ready"} lobby-action-button`}
                onClick={onReadyToggle}
                type="button"
              >
                {readyButtonLabel}
              </button>
              <button
                className="btn btn-lg btn-share lobby-action-button"
                onClick={onCopyShareLink}
                type="button"
              >
                {shareButtonLabel}
              </button>
            </div>

            {showStartButton ? (
              <button
                className="btn btn-lg btn-start lobby-start-button"
                disabled={startDisabled}
                onClick={onStartGame}
                type="button"
              >
                {pendingAction === "start" ? "Starting..." : "Start game"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
