"use client";

import { startTransition, useEffect, useMemo, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  createRoom,
  getErrorMessage,
  joinRoom,
  leaveRoom,
  setReady,
  startGame,
  subscribeToAnonymousUser,
  subscribeToLobby,
  type PlayerDoc,
  type RoomDoc,
} from "@/lib/firebase-client";
import {
  buildRoomShareLink,
  buildRoomShareQuery,
  extractRoomCodeFromSearch,
  getAssignedNameNotice,
  getLobbyStartState,
  normalizeRoomCodeInput,
} from "@/lib/lobby-utils";

type EntryMode = "create" | "join";

type AvatarOption = {
  id: string;
  emoji: string;
  from: string;
  to: string;
  border: string;
};

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "spark", emoji: "⚡", from: "#59efff", to: "#4d8cff", border: "#7ae5ff" },
  { id: "crown", emoji: "👑", from: "#ffe86b", to: "#ffae22", border: "#ffe46e" },
  { id: "party", emoji: "🎉", from: "#ff8be5", to: "#b55dff", border: "#ff9ef0" },
  { id: "rocket", emoji: "🚀", from: "#91ff6a", to: "#35d91c", border: "#a7ff84" },
  { id: "mask", emoji: "🎭", from: "#4df2d0", to: "#288fd9", border: "#84fff0" },
  { id: "dice", emoji: "🎲", from: "#ffd86e", to: "#ff7d3a", border: "#ffdc94" },
];

function getAvatarOption(avatarId: string | null | undefined) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId) ?? AVATAR_OPTIONS[0];
}

function getValidationError(displayName: string, roomCode: string, mode: EntryMode) {
  if (displayName.length === 0) {
    return "Enter a display name to continue.";
  }

  if (mode === "join" && roomCode.length !== 6) {
    return "Enter the 6-digit room code.";
  }

  return null;
}

function getAvatarStyle(avatar: AvatarOption): CSSProperties {
  return {
    backgroundImage: `linear-gradient(180deg, ${avatar.from}, ${avatar.to})`,
    borderColor: avatar.border,
  };
}

export function WannabeApp() {
  const [entryMode, setEntryMode] = useState<EntryMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_OPTIONS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    const initialRoomCode = extractRoomCodeFromSearch(window.location.search);
    if (initialRoomCode) {
      setJoinCode(initialRoomCode);
      setEntryMode("join");
      setNoticeMessage("Share link detected. Enter your name to join the room.");
    }

    try {
      return subscribeToAnonymousUser(
        (user) => {
          startTransition(() => {
            setAuthUid(user?.uid ?? null);
            setAuthError(null);
          });
        },
        (message) => {
          startTransition(() => {
            setAuthError(message);
          });
        },
      );
    } catch (error) {
      setAuthError(getErrorMessage(error));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setPlayers([]);
      return undefined;
    }

    try {
      return subscribeToLobby(roomId, {
        onRoom: (nextRoom) => {
          startTransition(() => {
            setRoom(nextRoom);
            if (!nextRoom) {
              setErrorMessage("Room is no longer available.");
            }
          });
        },
        onPlayers: (nextPlayers) => {
          startTransition(() => {
            setPlayers(nextPlayers);
          });
        },
        onError: (message) => {
          startTransition(() => {
            setErrorMessage(message);
          });
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return undefined;
    }
  }, [roomId]);

  useEffect(() => {
    if (!room?.roomCode || room.status !== "lobby") {
      return;
    }

    window.history.replaceState({}, "", buildRoomShareQuery(room.roomCode));
  }, [room?.roomCode, room?.status]);

  useEffect(() => {
    if (!copiedShareLink) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopiedShareLink(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedShareLink]);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerId === authUid) ?? null,
    [authUid, players],
  );

  const startState = useMemo(
    () =>
      getLobbyStartState({
        currentPlayerId: currentPlayer?.playerId ?? null,
        hostPlayerId: room?.hostPlayerId ?? null,
        players,
      }),
    [currentPlayer?.playerId, room?.hostPlayerId, players],
  );

  const validationError = getValidationError(displayName, joinCode, entryMode);
  const shareLink =
    typeof window === "undefined" || !room?.roomCode
      ? ""
      : buildRoomShareLink(window.location.origin, room.roomCode);

  async function runEntryAction() {
    if (!authUid || authError || validationError) {
      if (validationError) {
        setErrorMessage(validationError);
      }
      return;
    }

    setPendingAction(entryMode);
    setErrorMessage(null);

    try {
      const requestedName = displayName;
      const result =
        entryMode === "create"
          ? await createRoom({
              displayName: requestedName,
              avatarId: selectedAvatarId,
            })
          : await joinRoom({
              roomCode: joinCode,
              displayName: requestedName,
              avatarId: selectedAvatarId,
            });

      setRoomId(result.roomId);
      setNoticeMessage(getAssignedNameNotice(requestedName, result.assignedDisplayName));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReadyToggle(nextReady: boolean) {
    if (!roomId) {
      return;
    }

    setPendingAction("ready");
    setErrorMessage(null);

    try {
      await setReady({ roomId, ready: nextReady });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStartGame() {
    if (!roomId || !startState.canStart) {
      return;
    }

    setPendingAction("start");
    setErrorMessage(null);

    try {
      await startGame({ roomId });
      setNoticeMessage("Game started. In-game screens arrive in M4-T3.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLeaveRoom() {
    if (!roomId) {
      return;
    }

    setPendingAction("leave");
    setErrorMessage(null);

    try {
      await leaveRoom({ roomId });
      setRoomId(null);
      setRoom(null);
      setPlayers([]);
      window.history.replaceState({}, "", "/");
      setNoticeMessage("Left the room.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopyShareLink() {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedShareLink(true);
      setNoticeMessage("Share link copied.");
    } catch {
      setErrorMessage("Could not copy the share link.");
    }
  }

  const showLobby = Boolean(roomId && room?.status === "lobby" && currentPlayer);

  return (
    <main className="toy-page min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
        <section className="toy-shell overflow-hidden rounded-[2rem] px-5 py-5 sm:px-7 sm:py-7">
          <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <section className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="hud-pill bg-[#0c47a9] text-white">
                  Milestone 4 / Task 2
                </span>
                <span className="hud-pill bg-[#56efff] text-[#0d3560]">
                  entry + lobby
                </span>
              </div>

              <div>
                <h1 className="max-w-3xl text-balance text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)] sm:text-6xl lg:text-7xl">
                  Create a room fast. Get everyone ready faster.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-[#d8ecff] sm:text-xl">
                  This is now the real entry surface for the MVP. Anonymous auth,
                  room creation, join-by-code, share-link joins, ready toggles,
                  and host start controls all run here.
                </p>
              </div>

              <div className="toy-chip-panel rounded-[1.8rem] p-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    className={`section-banner ${entryMode === "create" ? "bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]" : "bg-[#104391] text-white"}`}
                    onClick={() => setEntryMode("create")}
                    type="button"
                  >
                    Create room
                  </button>
                  <button
                    className={`section-banner ${entryMode === "join" ? "bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]" : "bg-[#104391] text-white"}`}
                    onClick={() => setEntryMode("join")}
                    type="button"
                  >
                    Join room
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.16em] text-[#d8ecff]">
                      Display name
                    </span>
                    <input
                      className="toy-input"
                      maxLength={16}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Captain Maybe"
                      value={displayName}
                    />
                  </label>

                  {entryMode === "join" ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-black uppercase tracking-[0.16em] text-[#d8ecff]">
                        Room code
                      </span>
                      <input
                        className="toy-input"
                        inputMode="numeric"
                        onChange={(event) =>
                          setJoinCode(normalizeRoomCodeInput(event.target.value))
                        }
                        placeholder="482901"
                        value={joinCode}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d8ecff]">
                    Pick an avatar
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        className={`avatar-choice ${selectedAvatarId === avatar.id ? "avatar-choice-active" : ""}`}
                        key={avatar.id}
                        onClick={() => setSelectedAvatarId(avatar.id)}
                        style={getAvatarStyle(avatar)}
                        type="button"
                      >
                        <span className="text-3xl">{avatar.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    disabled={Boolean(validationError || pendingAction || authError)}
                    onClick={() => void runEntryAction()}
                    size="lg"
                  >
                    {pendingAction === entryMode
                      ? entryMode === "create"
                        ? "Creating..."
                        : "Joining..."
                      : entryMode === "create"
                        ? "Create room"
                        : "Join room"}
                  </Button>
                  <div className="score-pill">
                    <span className="text-[#9ad9ff]">Auth</span>
                    <span className="ml-2 text-white">
                      {authUid ? "Ready" : authError ? "Error" : "Connecting"}
                    </span>
                  </div>
                </div>

                {validationError ? (
                  <p className="mt-4 text-sm text-[#ffd86e]">{validationError}</p>
                ) : null}
              </div>

              {noticeMessage ? <div className="status-callout">{noticeMessage}</div> : null}
              {errorMessage || authError ? (
                <div className="status-callout status-callout-error">
                  {errorMessage ?? authError}
                </div>
              ) : null}
            </section>

            <section className="toy-shell rounded-[1.9rem] bg-[#0b3d95]/70 px-4 py-4 sm:px-5">
              {showLobby && room ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d8ecff]">
                        Lobby
                      </p>
                      <p className="mt-2 text-4xl font-black uppercase tracking-[-0.04em] text-white">
                        Room {room.roomCode}
                      </p>
                    </div>
                    <button
                      className="ghost-control"
                      onClick={() => void handleLeaveRoom()}
                      type="button"
                    >
                      {pendingAction === "leave" ? "Leaving..." : "Leave"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-[#082f76] px-4 py-4 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                          Share link
                        </p>
                        <p className="mt-2 break-all text-sm text-white">{shareLink}</p>
                      </div>
                      <Button
                        onClick={() => void handleCopyShareLink()}
                        variant="secondary"
                      >
                        {copiedShareLink ? "Copied" : "Copy link"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {players.map((player) => {
                      const avatar = getAvatarOption(player.avatarId);
                      const isCurrent = player.playerId === currentPlayer?.playerId;
                      const isHost = player.playerId === room.hostPlayerId;

                      return (
                        <div
                          className="toy-list-row flex items-center justify-between gap-3 rounded-[1.4rem] px-4 py-3"
                          key={player.playerId}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="avatar-orb flex size-12 items-center justify-center rounded-full text-2xl"
                              style={getAvatarStyle(avatar)}
                            >
                              {avatar.emoji}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-lg font-black uppercase text-white">
                                {player.displayName}
                              </p>
                              <p className="text-sm text-[#d9eeff]">
                                {isCurrent
                                  ? "This is you."
                                  : isHost
                                    ? "Current host."
                                    : "Waiting in the lobby."}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`hud-pill ${player.ready ? "bg-[#8cff56] text-[#114f1c]" : "bg-[#ff82ea] text-[#6d1676]"}`}
                          >
                            {isHost ? "HOST" : player.ready ? "READY" : "NOT READY"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="rounded-[1.5rem] bg-[#082f76] px-4 py-4 ring-1 ring-white/10">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                        Ready state
                      </p>
                      <p className="mt-2 text-sm text-[#d8ecff]">
                        Every player needs to toggle ready before the host can begin.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          onClick={() => void handleReadyToggle(!currentPlayer?.ready)}
                          variant={currentPlayer?.ready ? "secondary" : "default"}
                        >
                          {pendingAction === "ready"
                            ? "Updating..."
                            : currentPlayer?.ready
                              ? "Mark not ready"
                              : "Mark ready"}
                        </Button>
                        <div className="score-pill">
                          <span className="text-[#9ad9ff]">Status</span>
                          <span className="ml-2 text-white">
                            {currentPlayer?.ready ? "Ready" : "Waiting"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-[#082f76] px-4 py-4 ring-1 ring-white/10">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                        Host controls
                      </p>
                      <p className="mt-2 max-w-xs text-sm text-[#d8ecff]">
                        {startState.reason}
                      </p>
                      <div className="mt-4">
                        <Button
                          disabled={!startState.canStart || pendingAction === "start"}
                          onClick={() => void handleStartGame()}
                          size="lg"
                        >
                          {pendingAction === "start" ? "Starting..." : "Start game"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : roomId && room?.status === "inGame" ? (
                <div className="flex min-h-[30rem] flex-col items-start justify-center gap-4 rounded-[1.8rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10">
                  <p className="section-banner bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
                    Game started
                  </p>
                  <h2 className="text-4xl font-black uppercase tracking-[-0.04em] text-white">
                    Lobby handoff complete.
                  </h2>
                  <p className="max-w-xl text-lg leading-8 text-[#d8ecff]">
                    The room is live and the backend has moved into the first
                    round. The actual in-game phase screens land in `M4-T3`.
                  </p>
                </div>
              ) : roomId && room?.status === "ended" ? (
                <div className="flex min-h-[30rem] flex-col items-start justify-center gap-4 rounded-[1.8rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10">
                  <p className="section-banner bg-linear-to-r from-[#ff8be5] to-[#b55dff] text-white">
                    Room ended
                  </p>
                  <h2 className="text-4xl font-black uppercase tracking-[-0.04em] text-white">
                    This room is no longer joinable.
                  </h2>
                  <p className="max-w-xl text-lg leading-8 text-[#d8ecff]">
                    Ended-room handling is working. You can go back and create a
                    new room from here.
                  </p>
                  <Button
                    onClick={() => {
                      setRoomId(null);
                      setRoom(null);
                      setPlayers([]);
                      window.history.replaceState({}, "", "/");
                    }}
                    size="lg"
                    variant="secondary"
                  >
                    Back to main
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-[30rem] flex-col justify-between rounded-[1.8rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10">
                  <div>
                    <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                      Main screen
                    </p>
                    <h2 className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white">
                      Pick a name, choose an avatar, and create or join with a code.
                    </h2>
                    <p className="mt-4 max-w-xl text-lg leading-8 text-[#d8ecff]">
                      Share-link joins use the query format `?room=482901`. Once
                      you are in a lobby, this panel turns into the real room
                      view with live player status and host controls.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Main flow</div>
                      <p className="mt-4 text-xl font-black uppercase text-white">
                        Room creation and join now use the actual Firebase callables.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Lobby flow</div>
                      <p className="mt-4 text-xl font-black uppercase text-white">
                        Ready toggles, player list updates, and host-only start gating are live.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
