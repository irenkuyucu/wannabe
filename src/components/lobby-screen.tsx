import { bangers } from "@/app/fonts";
import { AvatarArt } from "@/components/avatar-art";
import { getAvatarOption, type AvatarOption } from "@/lib/avatar-options";
import type { PlayerDoc } from "@/lib/firebase-client";

type LobbyScreenProps = {
  copiedShareLink: boolean;
  currentPlayer: PlayerDoc;
  hostPlayerId: string;
  noticeMessage: string | null;
  onCopyShareLink: () => void;
  onReadyToggle: () => void;
  onStartGame: () => void;
  pendingAction: string | null;
  players: PlayerDoc[];
  roomCode: string;
  showStartButton: boolean;
  startDisabled: boolean;
  statusMessage: string | null;
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
  noticeMessage,
  onCopyShareLink,
  onReadyToggle,
  onStartGame,
  pendingAction,
  players,
  roomCode,
  showStartButton,
  startDisabled,
  statusMessage,
}: LobbyScreenProps) {
  const readyButtonLabel =
    pendingAction === "ready"
      ? "Updating..."
      : currentPlayer.ready
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
        <p className="lobby-screen-room-code">Room {roomCode}</p>

        <div className="lobby-screen-roster">
          {players.map((player) => {
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

        <div className="lobby-actions-row">
          <button
            className={`lobby-action-button ${currentPlayer.ready ? "lobby-action-button-unready" : "lobby-action-button-ready"}`}
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

        {statusMessage || noticeMessage ? (
          <div className="lobby-screen-status">
            {statusMessage ?? noticeMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
