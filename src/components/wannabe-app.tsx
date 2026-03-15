"use client";

import {
  type ReactNode,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArgumentScreen } from "@/components/argument-screen";
import { EndGameScreen } from "@/components/end-game-screen";
import { GameOverPanel } from "@/components/game-over-panel";
import { ChoiceScreen } from "@/components/choice-screen";
import { EntryScreen } from "@/components/entry-screen";
import { HostPromotionToast } from "@/components/host-promotion-toast";
import { InGamePanel } from "@/components/in-game-panel";
import { LobbyScreen } from "@/components/lobby-screen";
import { RebuttalScreen } from "@/components/rebuttal-screen";
import { ResolutionScreen } from "@/components/resolution-screen";
import { TitleScreen } from "@/components/title-screen";
import { VerdictScreen } from "@/components/verdict-screen";
import { buildResolutionSummary } from "@/lib/session-summary";
import {
  DEFAULT_AVATAR_ID,
  getAvatarOption,
} from "@/lib/avatar-options";
import { AvatarArt } from "@/components/avatar-art";
import {
  getDisplayNameIssue,
  getDisplayNameIssueMessage,
} from "@/lib/entry-validation";
import {
  advanceResolution,
  advanceRebuttal,
  createRoom,
  endArgumentTurn,
  getErrorMessage,
  joinRoom,
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
import { getHostPromotionNotice } from "@/lib/host-promotion";

type EntryMode = "create" | "join";
const SPLASH_MIN_DURATION_MS = 2000;

function getValidationError(displayName: string, roomCode: string, mode: EntryMode) {
  if (getDisplayNameIssue(displayName)) {
    return null;
  }

  if (mode === "join" && roomCode.length !== 6) {
    return "Enter the 6-digit room code.";
  }

  return null;
}

export function WannabeApp() {
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);
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
  const [showDetails, setShowDetails] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [dismissedHostPromotionKeys, setDismissedHostPromotionKeys] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickingPhaseKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let frameId = 0;
    const startAt = performance.now();

    const step = () => {
      const elapsed = performance.now() - startAt;
      const normalized = Math.min(elapsed / SPLASH_MIN_DURATION_MS, 1);
      const easedProgress = 1 - (1 - normalized) ** 3;

      setSplashProgress(easedProgress);

      if (normalized < 1) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      setShowSplash(false);
    };

    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const initialRoomCode = extractRoomCodeFromSearch(window.location.search);
    if (initialRoomCode) {
      setInviteRoomCode(initialRoomCode);
      setJoinCode(initialRoomCode);
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
      setShowDetails(false);
      setDismissedHostPromotionKeys([]);
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
    if (!validationNotice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setValidationNotice(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [validationNotice]);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerId === authUid) ?? null,
    [authUid, players],
  );

  const hostPromotionNotice = getHostPromotionNotice({
    currentPlayerId: currentPlayer?.playerId ?? null,
    room,
  });
  const visibleHostPromotionNotice =
    hostPromotionNotice && !dismissedHostPromotionKeys.includes(hostPromotionNotice.key)
      ? hostPromotionNotice
      : null;

  useEffect(() => {
    if (!visibleHostPromotionNotice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setDismissedHostPromotionKeys((current) =>
        current.includes(visibleHostPromotionNotice.key)
          ? current
          : [...current, visibleHostPromotionNotice.key],
      );
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [visibleHostPromotionNotice]);

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

  useEffect(() => {
    if (pendingAction !== "advance-resolution" || room?.status !== "ended") {
      return;
    }

    handleReturnToMain();
    setPendingAction(null);
  }, [pendingAction, room?.status]);

  const startState = useMemo(
    () =>
      getLobbyStartState({
        currentPlayerId: currentPlayer?.playerId ?? null,
        hostPlayerId: room?.hostPlayerId ?? null,
        players,
      }),
    [currentPlayer?.playerId, room?.hostPlayerId, players],
  );

  const shareLink =
    typeof window === "undefined" || !room?.roomCode
      ? ""
      : buildRoomShareLink(window.location.origin, room.roomCode);

  const dismissHostPromotionNotice = () => {
    if (!hostPromotionNotice) {
      return;
    }

    setDismissedHostPromotionKeys((current) =>
      current.includes(hostPromotionNotice.key)
        ? current
        : [...current, hostPromotionNotice.key],
    );
  };

  function renderWithGlobalToast(content: ReactNode) {
    return (
      <>
        {visibleHostPromotionNotice ? (
          <HostPromotionToast
            message={visibleHostPromotionNotice.message}
            onDismiss={dismissHostPromotionNotice}
          />
        ) : null}
        {content}
      </>
    );
  }

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

  async function runEntryAction(mode: EntryMode) {
    const displayNameIssue = getDisplayNameIssue(displayName);
    if (displayNameIssue) {
      setValidationNotice(getDisplayNameIssueMessage(displayNameIssue));
      setErrorMessage(null);
      return;
    }

    const entryValidationError = getValidationError(displayName, joinCode, mode);

    if (!authUid || authError || entryValidationError) {
      if (entryValidationError) {
        setErrorMessage(entryValidationError);
      }
      return;
    }

    setPendingAction(mode);
    setErrorMessage(null);

    try {
      const requestedName = displayName;
      const result =
        mode === "create"
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

  async function handleEndGameReturnToMain() {
    if (!roomId) {
      handleReturnToMain();
      return;
    }

    const isFinalRoundResolutionHost =
      room?.status === "inGame" &&
      room.phase === "resolution" &&
      currentPlayer?.playerId === room.hostPlayerId;

    if (!isFinalRoundResolutionHost) {
      handleReturnToMain();
      return;
    }

    setPendingAction("advance-resolution");
    setErrorMessage(null);

    try {
      await advanceResolution({ roomId });
      handleReturnToMain();
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
    setInviteRoomCode(null);
    setJoinCode("");
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
  const showCompactRoomSidebar = Boolean(roomId && room && currentPlayer);
  const roomStatusLabel =
    room?.status === "lobby"
      ? "Lobby open"
      : room?.status === "inGame"
        ? "Round in motion"
        : room?.status === "ended"
          ? "Session ended"
          : "Main menu";
  const roomHeroTitle =
    room?.status === "lobby"
      ? `Room ${room.roomCode} is readying up.`
      : room?.status === "inGame"
        ? `Room ${room.roomCode} is live.`
        : room?.status === "ended"
          ? `Room ${room.roomCode} has wrapped.`
          : "Launch the room. Then play the full session in real time.";
  const roomHeroDescription =
    room?.status === "lobby"
      ? "Ready checks, share-link handoff, and host controls stay tight while the main panel focuses on the live lobby."
      : room?.status === "inGame"
        ? "The left rail keeps room context visible while the main panel stays dedicated to the active phase."
        : room?.status === "ended"
          ? "Final messaging and the scoreboard stay centered in the main panel while the room summary remains nearby."
        : "Entry, lobby, round phases, resolution, and game over now share the same toy-like surface. The live UI reads directly from Firebase room state from first join through final scoreboard.";

  if (showSplash) {
    return <TitleScreen progress={splashProgress} />;
  }

  if (!showCompactRoomSidebar) {
    return (
      <EntryScreen
        authError={authError}
        authReady={Boolean(authUid)}
        createDisabled={Boolean(pendingAction || authError)}
        createPending={pendingAction === "create"}
        displayName={displayName}
        errorMessage={errorMessage}
        inviteRoomCode={inviteRoomCode}
        isAvatarPickerOpen={isAvatarPickerOpen}
        joinCode={joinCode}
        joinDisabled={Boolean(pendingAction || authError)}
        joinPending={pendingAction === "join"}
        noticeMessage={noticeMessage}
        onAvatarPickerClose={() => setIsAvatarPickerOpen(false)}
        onAvatarPickerOpen={() => setIsAvatarPickerOpen(true)}
        onAvatarSelect={setSelectedAvatarId}
        onDismissValidationNotice={() => setValidationNotice(null)}
        onCreateRoom={() => void runEntryAction("create")}
        onDisplayNameChange={setDisplayName}
        onJoinCodeChange={(value) => setJoinCode(normalizeRoomCodeInput(value))}
        onJoinRoom={() => void runEntryAction("join")}
        selectedAvatar={getAvatarOption(selectedAvatarId)}
        validationNotice={validationNotice}
      />
    );
  }

  if (showLobby && room && currentPlayer) {
    return renderWithGlobalToast(
      <LobbyScreen
        copiedShareLink={copiedShareLink}
        currentPlayer={currentPlayer}
        hostPlayerId={room.hostPlayerId}
        noticeMessage={noticeMessage}
        onCopyShareLink={() => void handleCopyShareLink()}
        onReadyToggle={() => void handleReadyToggle(!currentPlayer.ready)}
        onStartGame={() => void handleStartGame()}
        pendingAction={pendingAction}
        players={players}
        roomCode={room.roomCode}
        showStartButton={currentPlayer.playerId === room.hostPlayerId}
        startDisabled={!startState.canStart || pendingAction === "start"}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "choice") {
    return renderWithGlobalToast(
      <ChoiceScreen
        currentPlayer={currentPlayer}
        noticeMessage={noticeMessage}
        nowMs={nowMs}
        onSubmitChoice={(side) => void handleSubmitChoice(side)}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
        showDetails={showDetails}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "argument") {
    return renderWithGlobalToast(
      <ArgumentScreen
        currentPlayer={currentPlayer}
        noticeMessage={noticeMessage}
        nowMs={nowMs}
        onEndArgumentTurn={() => void handleEndArgumentTurn()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
        showDetails={showDetails}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "rebuttal") {
    return renderWithGlobalToast(
      <RebuttalScreen
        currentPlayer={currentPlayer}
        noticeMessage={noticeMessage}
        nowMs={nowMs}
        onAdvanceRebuttal={() => void handleAdvanceRebuttal()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
        showDetails={showDetails}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "verdict") {
    return renderWithGlobalToast(
      <VerdictScreen
        currentPlayer={currentPlayer}
        noticeMessage={noticeMessage}
        nowMs={nowMs}
        onSubmitVerdict={(verdict) => void handleSubmitVerdict(verdict)}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
        showDetails={showDetails}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "resolution") {
    const resolutionSummary = buildResolutionSummary({ room, round, players });

    if (resolutionSummary.isFinalRound) {
      return renderWithGlobalToast(
        <EndGameScreen
          latestRound={round}
          onReturnToMain={() => void handleEndGameReturnToMain()}
          pendingAction={pendingAction}
          players={players}
          room={room}
          statusMessage={errorMessage ?? authError}
        />
      );
    }

    return renderWithGlobalToast(
      <ResolutionScreen
        currentPlayer={currentPlayer}
        noticeMessage={noticeMessage}
        onAdvanceResolution={() => void handleAdvanceResolution()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  if (roomId && room?.status === "ended") {
    return renderWithGlobalToast(
      <EndGameScreen
        latestRound={latestRound}
        onReturnToMain={() => void handleEndGameReturnToMain()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        statusMessage={errorMessage ?? authError}
      />
    );
  }

  return (
    <main className="toy-page min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-4 lg:gap-5">
        <section className="toy-shell overflow-hidden rounded-[2rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          <div
            className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)] lg:gap-5"
          >
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="section-banner bg-linear-to-r from-[#56efff] to-[#4d8cff] text-[#14356b]">
                  Wannabe
                </span>
                {showCompactRoomSidebar ? (
                  <button
                    className="ghost-control"
                    onClick={() => setShowDetails((current) => !current)}
                    type="button"
                  >
                    {showDetails ? "Hide details" : "Show details"}
                  </button>
                ) : null}
              </div>

              <div>
                {showCompactRoomSidebar && room && currentPlayer ? (
                  <>
                    <h1 className="max-w-lg text-balance text-[clamp(1.95rem,2.6vw,3.1rem)] font-black uppercase leading-[0.94] tracking-[-0.045em] text-white drop-shadow-[0_3px_0_rgba(11,49,116,0.95)]">
                      {roomHeroTitle}
                    </h1>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-[#d8ecff] sm:text-[0.95rem] sm:leading-7">
                      {roomHeroDescription}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="max-w-2xl text-balance text-[clamp(2.4rem,4.2vw,4rem)] font-black uppercase leading-[0.9] tracking-[-0.055em] text-white drop-shadow-[0_3px_0_rgba(11,49,116,0.95)]">
                      {roomHeroTitle}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8ecff] sm:text-[0.98rem] sm:leading-7">
                      {roomHeroDescription}
                    </p>
                  </>
                )}
              </div>

              {showCompactRoomSidebar && room && currentPlayer ? (
                <div className="toy-chip-panel rounded-[1.45rem] p-3.5 lg:p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="avatar-orb flex size-12 items-center justify-center rounded-full text-2xl"
                    >
                      <AvatarArt
                        avatar={getAvatarOption(currentPlayer.avatarId)}
                        className="avatar-image"
                        decorative
                      />
                    </div>
                    <div>
                      <p className="text-base font-black uppercase text-white">
                        {currentPlayer.displayName}
                      </p>
                      <p className="text-sm text-[#d8ecff]">
                        {currentPlayer.playerId === room.hostPlayerId ? "Current host" : "Active player"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Room code
                      </p>
                      <p className="mt-1.5 text-xl font-black uppercase text-white">
                        {room.roomCode}
                      </p>
                    </div>
                    <div className="phase-roster">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Players
                      </p>
                      <p className="mt-1.5 text-xl font-black uppercase text-white">
                        {players.length}
                      </p>
                    </div>
                    <div className="phase-roster sm:col-span-2">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Current focus
                      </p>
                      <p className="mt-1.5 text-lg font-black uppercase text-white">
                        {room.status === "inGame"
                          ? room.phase ?? "Live round"
                          : room.status === "ended"
                            ? "Session complete"
                            : "Ready up"}
                      </p>
                    </div>
                    {showDetails ? (
                      <>
                        <div className="phase-roster">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Room state
                          </p>
                          <p className="mt-1.5 text-xl font-black uppercase text-white">
                            {roomStatusLabel}
                          </p>
                        </div>
                        <div className="phase-roster">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Your state
                          </p>
                          <p className="mt-1.5 text-xl font-black uppercase text-white">
                            {room.status === "lobby"
                              ? currentPlayer.ready
                                ? "Ready"
                                : "Waiting"
                              : currentPlayer.playerId === room.hostPlayerId
                                ? "Host"
                                : "Player"}
                          </p>
                        </div>
                        <div className="phase-roster sm:col-span-2">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Progress
                          </p>
                          <p className="mt-1.5 text-lg font-black uppercase text-white">
                            {room.status === "inGame"
                              ? `Round ${(room.roundIndex ?? 0) + 1} of ${room.roundsTotal}`
                              : room.status === "ended"
                                ? "The room is readable but closed."
                                : "Waiting for everyone to ready up."}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {noticeMessage ? <div className="status-callout">{noticeMessage}</div> : null}
              {errorMessage || authError ? (
                <div className="status-callout status-callout-error">
                  {errorMessage ?? authError}
                </div>
              ) : null}
            </section>

            <section className="toy-shell rounded-[1.7rem] bg-[#0b3d95]/70 px-4 py-4 sm:px-5 lg:px-6">
              {showInGame && room && currentPlayer ? (
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
                  showDetails={showDetails}
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
                <div className="flex min-h-[20rem] flex-col items-center justify-center gap-4 rounded-[1.5rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10 lg:min-h-[24rem]">
                  <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                    Syncing round
                  </p>
                  <p className="max-w-xl text-center text-lg leading-8 text-[#d8ecff]">
                    Room state is live. Waiting for the active player and round snapshot to settle.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[20rem] flex-col justify-between rounded-[1.5rem] bg-[#082f76] px-5 py-5 ring-1 ring-white/10 lg:min-h-[24rem]">
                  <div>
                    <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                      How it works
                    </p>
                    <h2 className="mt-5 max-w-2xl text-[clamp(1.75rem,2.6vw,2.8rem)] font-black uppercase leading-[0.94] tracking-[-0.04em] text-white">
                      Pick a name, choose an avatar, and create or join with a code.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[#d8ecff] sm:text-lg sm:leading-8">
                      Share-link joins use the query format `?room=482901`. Once
                      you are in a lobby, this panel turns into the live room
                      surface and continues into the timed round screens after start.
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="toy-chip-panel rounded-[1.35rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Step 1</div>
                      <p className="mt-3 text-lg font-black uppercase text-white">
                        Create a room or join with a six-digit code.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[1.35rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Step 2</div>
                      <p className="mt-3 text-lg font-black uppercase text-white">
                        Ready up in the lobby and let the host start the session.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[1.35rem] px-4 py-4">
                      <div className="score-pill max-w-fit">Step 3</div>
                      <p className="mt-3 text-lg font-black uppercase text-white">
                        Follow the phase prompts from choice to final scoreboard.
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
