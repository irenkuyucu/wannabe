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
    <div className="lobby-avatar">
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

  return (
    <section className="lobby-screen">
      <div className="lobby-screen-shell toy-float">
        <h1 className={`${bangers.className} lobby-screen-logo`} style={bangers.style}>
          Wannabe!
        </h1>
        <p className="lobby-screen-room-code">Room {roomCode} Lobby</p>

        <div className="lobby-screen-roster">
          {isLoading ? (
            <div className="lobby-player-row lobby-player-row-skeleton" aria-hidden="true">
              <div className="lobby-player-main">
                <div className="lobby-avatar lobby-skeleton-block lobby-avatar-skeleton" />
                <div className="lobby-skeleton-block lobby-player-name-skeleton" />
              </div>
              <div className="lobby-ready-pill lobby-skeleton-block lobby-ready-pill-skeleton" />
            </div>
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
                  className={`lobby-ready-pill ${player.ready ? "lobby-ready-pill-ready" : "lobby-ready-pill-unready"}`}
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
              <div className="lobby-action-button lobby-action-button-skeleton lobby-skeleton-block" />
              <div className="lobby-action-button lobby-action-button-skeleton lobby-skeleton-block" />
            </div>
            {showStartButton ? (
              <div
                aria-hidden="true"
                className="lobby-start-button lobby-start-button-skeleton lobby-skeleton-block"
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="lobby-actions-row">
              <button
                className={`lobby-action-button ${currentPlayer?.ready ? "lobby-action-button-unready" : "lobby-action-button-ready"}`}
                onClick={onReadyToggle}
                type="button"
              >
                {readyButtonLabel}
              </button>
              <button
                className="lobby-action-button lobby-action-button-share"
                onClick={onCopyShareLink}
                type="button"
              >
                {shareButtonLabel}
              </button>
            </div>

            {showStartButton ? (
              <button
                className="lobby-start-button"
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
