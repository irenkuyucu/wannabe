"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { GameOverPanel } from "@/components/game-over-panel";
import { InGamePanel } from "@/components/in-game-panel";
import { Button } from "@/components/ui/button";
import {
  AVATAR_OPTIONS,
  getAvatarOption,
  getAvatarStyle,
} from "@/lib/avatar-options";
import {
  advanceResolution,
  advanceRebuttal,
  createRoom,
  endArgumentTurn,
  getErrorMessage,
  joinRoom,
  leaveRoom,
  setReady,
  startGame,
  submitChoice,
  submitVerdict,
  subscribeToAnonymousUser,
  subscribeToLobby,
  subscribeToRound,
  tickRoom,
  type PlayerDoc,
  type RoomDoc,
  type RoundDoc,
} from "@/lib/firebase-client";
import { getPhaseDriverDelayMs } from "@/lib/in-game-ui";
import {
  buildRoomShareLink,
  buildRoomShareQuery,
  extractRoomCodeFromSearch,
  getAssignedNameNotice,
  getLobbyStartState,
  normalizeRoomCodeInput,
} from "@/lib/lobby-utils";

type EntryMode = "create" | "join";

function getValidationError(displayName: string, roomCode: string, mode: EntryMode) {
  if (displayName.length === 0) {
    return "Enter a display name to continue.";
  }

  if (mode === "join" && roomCode.length !== 6) {
    return "Enter the 6-digit room code.";
  }

  return null;
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
  const [round, setRound] = useState<RoundDoc | null>(null);
  const [latestRound, setLatestRound] = useState<RoundDoc | null>(null);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickingPhaseKeyRef = useRef<string | null>(null);

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
      setRound(null);
      setLatestRound(null);
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
    if (
      !roomId ||
      room?.status !== "inGame" ||
      room?.roundIndex === null ||
      room?.roundIndex === undefined
    ) {
      setRound(null);
      return undefined;
    }

    try {
      return subscribeToRound(roomId, room.roundIndex, {
        onRound: (nextRound) => {
          startTransition(() => {
            setRound(nextRound);
            if (nextRound) {
              setLatestRound(nextRound);
            }
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
  }, [room?.roundIndex, room?.status, roomId]);

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

  useEffect(() => {
    setNowMs(Date.now());

    if (room?.status !== "inGame" || room.phaseDeadlineAtMs === null) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [room?.phaseDeadlineAtMs, room?.status]);

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

  const runTimedPhaseTick = useEffectEvent(async (phaseKey: string) => {
    if (
      tickingPhaseKeyRef.current === phaseKey ||
      !roomId ||
      !room ||
      room.status !== "inGame" ||
      room.phase === null ||
      room.phase === "resolution" ||
      room.phaseDeadlineAtMs === null
    ) {
      return;
    }

    tickingPhaseKeyRef.current = phaseKey;

    try {
      await tickRoom({ roomId });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      tickingPhaseKeyRef.current = null;
    }
  });

  useEffect(() => {
    if (
      !roomId ||
      !room ||
      room.status !== "inGame" ||
      room.phase === null ||
      room.phase === "resolution" ||
      room.phaseDeadlineAtMs === null ||
      !currentPlayer
    ) {
      return undefined;
    }

    const delayMs =
      Math.max(room.phaseDeadlineAtMs - Date.now(), 0) +
      (getPhaseDriverDelayMs(players, currentPlayer.playerId) ?? 0) +
      80;
    const phaseKey = `${room.roundIndex}:${room.phase}:${room.phaseDeadlineAtMs}`;
    const timeout = window.setTimeout(() => {
      void runTimedPhaseTick(phaseKey);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [
    currentPlayer,
    players,
    room,
    roomId,
  ]);

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
      setNoticeMessage("Game started. The live round flow is active.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmitChoice(side: "A" | "B") {
    if (!roomId) {
      return;
    }

    setPendingAction(`choice-${side}`);
    setErrorMessage(null);

    try {
      await submitChoice({ roomId, side });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEndArgumentTurn() {
    if (!roomId) {
      return;
    }

    setPendingAction("end-turn");
    setErrorMessage(null);

    try {
      await endArgumentTurn({ roomId });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAdvanceRebuttal() {
    if (!roomId) {
      return;
    }

    setPendingAction("advance-rebuttal");
    setErrorMessage(null);

    try {
      await advanceRebuttal({ roomId });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmitVerdict(verdict: "A_WON" | "B_WON" | "DRAW") {
    if (!roomId) {
      return;
    }

    setPendingAction(`verdict-${verdict}`);
    setErrorMessage(null);

    try {
      await submitVerdict({ roomId, verdict });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAdvanceResolution() {
    if (!roomId) {
      return;
    }

    setPendingAction("advance-resolution");
    setErrorMessage(null);

    try {
      const result = await advanceResolution({ roomId });
      setNoticeMessage(
        result.nextState === "ended"
          ? "Game over. Final scoreboard is live."
          : "Next round started.",
      );
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
      setRound(null);
      setLatestRound(null);
      setPlayers([]);
      window.history.replaceState({}, "", "/");
      setNoticeMessage("Left the room.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function handleReturnToMain() {
    setRoomId(null);
    setRoom(null);
    setRound(null);
    setLatestRound(null);
    setPlayers([]);
    setErrorMessage(null);
    window.history.replaceState({}, "", "/");
    setNoticeMessage("Back on main.");
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
  const showInGame = Boolean(roomId && room?.status === "inGame" && currentPlayer);
  const showCompactRoomSidebar = Boolean(showInGame && room && currentPlayer);

  return (
    <main className="toy-page min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
        <section className="toy-shell overflow-hidden rounded-[2rem] px-5 py-5 sm:px-7 sm:py-7">
          <div
            className={`grid gap-6 ${showCompactRoomSidebar ? "xl:grid-cols-[0.72fr_1.28fr]" : "xl:grid-cols-[0.98fr_1.02fr]"}`}
          >
            <section className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="hud-pill bg-[#0c47a9] text-white">
                  Milestone 4 / Task 4
                </span>
                <span className="hud-pill bg-[#56efff] text-[#0d3560]">
                  full session flow
                </span>
              </div>

              <div>
                {showCompactRoomSidebar && room && currentPlayer ? (
                  <>
                    <h1 className="max-w-2xl text-balance text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)] sm:text-5xl">
                      Room {room.roomCode} is live.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-[#d8ecff] sm:text-lg">
                      Resolution, scoreboard, and game-over messaging now share the same live room
                      surface while the desktop layout still prioritizes the active phase panel.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="max-w-3xl text-balance text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)] sm:text-6xl lg:text-7xl">
                      Launch the room. Then play the full session in real time.
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#d8ecff] sm:text-xl">
                      Entry, lobby, round phases, resolution, and game over now share the same
                      toy-like surface. The live UI reads directly from Firebase room state from
                      first join through final scoreboard.
                    </p>
                  </>
                )}
              </div>

              {showCompactRoomSidebar && room && currentPlayer ? (
                <div className="toy-chip-panel rounded-[1.8rem] p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="avatar-orb flex size-14 items-center justify-center rounded-full text-3xl"
                      style={getAvatarStyle(getAvatarOption(currentPlayer.avatarId))}
                    >
                      {getAvatarOption(currentPlayer.avatarId).emoji}
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase text-white">
                        {currentPlayer.displayName}
                      </p>
                      <p className="text-sm text-[#d8ecff]">
                        {currentPlayer.playerId === room.hostPlayerId ? "Current host" : "Active player"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Room code
                      </p>
                      <p className="mt-2 text-2xl font-black uppercase text-white">
                        {room.roomCode}
                      </p>
                    </div>
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Phase
                      </p>
                      <p className="mt-2 text-2xl font-black uppercase text-white">
                        {room.phase ?? "Lobby"}
                      </p>
                    </div>
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Round
                      </p>
                      <p className="mt-2 text-2xl font-black uppercase text-white">
                        {(room.roundIndex ?? 0) + 1} / {room.roundsTotal}
                      </p>
                    </div>
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Auth
                      </p>
                      <p className="mt-2 text-2xl font-black uppercase text-white">
                        {authUid ? "Ready" : "Syncing"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}

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
              ) : showInGame && room && currentPlayer ? (
                <InGamePanel
                  currentPlayer={currentPlayer}
                  nowMs={nowMs}
                  onAdvanceResolution={() => void handleAdvanceResolution()}
                  onAdvanceRebuttal={() => void handleAdvanceRebuttal()}
                  onEndArgumentTurn={() => void handleEndArgumentTurn()}
                  onSubmitChoice={(side) => void handleSubmitChoice(side)}
                  onSubmitVerdict={(verdict) => void handleSubmitVerdict(verdict)}
                  pendingAction={pendingAction}
                  players={players}
                  room={room}
                  round={round}
                />
              ) : roomId && room?.status === "ended" ? (
                <GameOverPanel
                  currentPlayerId={currentPlayer?.playerId ?? null}
                  latestRound={latestRound}
                  onReturnToMain={handleReturnToMain}
                  players={players}
                  room={room}
                />
              ) : roomId && room?.status === "inGame" ? (
                <div className="flex min-h-[30rem] flex-col items-center justify-center gap-4 rounded-[1.8rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10">
                  <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                    Syncing round
                  </p>
                  <p className="max-w-xl text-center text-lg leading-8 text-[#d8ecff]">
                    Room state is live. Waiting for the active player and round snapshot to settle.
                  </p>
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
                      you are in a lobby, this panel turns into the live room
                      surface and continues into the timed round screens after start.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Main flow</div>
                      <p className="mt-4 text-xl font-black uppercase text-white">
                        Room creation and join use the actual Firebase callables.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Round flow</div>
                      <p className="mt-4 text-xl font-black uppercase text-white">
                        Choice through game over now stream live from room state.
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
