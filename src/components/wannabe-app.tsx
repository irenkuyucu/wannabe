"use client";

import {
  useCallback,
  type ReactNode,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  buildJoinRoomPath,
  buildLiveRoomPath,
  getAssignedNameNotice,
  getLobbyStartState,
  normalizeRoomCodeInput,
} from "@/lib/lobby-utils";
import { getHostPromotionNotice } from "@/lib/host-promotion";

type EntryMode = "create" | "join";
const SPLASH_MIN_DURATION_MS = 2000;

type WannabeAppProps = {
  initialInviteRoomCode?: string | null;
  initialLiveRoomCode?: string | null;
  initialShowSplash?: boolean;
};

function getValidationError(displayName: string, roomCode: string, mode: EntryMode) {
  if (getDisplayNameIssue(displayName)) {
    return null;
  }

  if (mode === "join" && roomCode.length !== 6) {
    return "Enter the 6-digit room code.";
  }

  return null;
}

export function WannabeApp({
  initialInviteRoomCode = null,
  initialLiveRoomCode = null,
  initialShowSplash = true,
}: WannabeAppProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(initialInviteRoomCode);
  const [joinCode, setJoinCode] = useState(initialInviteRoomCode ?? "");
  const [roomId, setRoomId] = useState<string | null>(initialLiveRoomCode);
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
  const [showSplash, setShowSplash] = useState(initialShowSplash);
  const [splashProgress, setSplashProgress] = useState(initialShowSplash ? 0 : 1);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [dismissedHostPromotionKeys, setDismissedHostPromotionKeys] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickingPhaseKeyRef = useRef<string | null>(null);
  const handleReturnToMain = useCallback(() => {
    setRoomId(null);
    setRoom(null);
    setRound(null);
    setLatestRound(null);
    setPlayers([]);
    setInviteRoomCode(null);
    setJoinCode("");
    setErrorMessage(null);
    router.replace("/");
    setNoticeMessage("Back on main.");
  }, [router]);

  useEffect(() => {
    if (!showSplash) {
      return undefined;
    }

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
  }, [showSplash]);

  useEffect(() => {
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
    if (!roomId || !authUid) {
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
  }, [authUid, roomId]);

  useEffect(() => {
    if (
      !roomId ||
      !authUid ||
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
  }, [authUid, room?.roundIndex, room?.status, roomId]);

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

  useEffect(() => {
    if ((errorMessage ?? authError) === null || room || currentPlayer) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setErrorMessage(null);
      setAuthError(null);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [authError, currentPlayer, errorMessage, room]);

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
    if (!initialLiveRoomCode || !authUid || room || currentPlayer || !errorMessage) {
      return;
    }

    router.replace(buildJoinRoomPath(initialLiveRoomCode));
  }, [authUid, currentPlayer, errorMessage, initialLiveRoomCode, room, router]);

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
  }, [handleReturnToMain, pendingAction, room?.status]);

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
      let nextRoomId = "";
      let nextRoomCode = "";
      let assignedDisplayName = "";

      if (mode === "create") {
        const result = await createRoom({
          displayName: requestedName,
          avatarId: selectedAvatarId,
        });
        nextRoomId = result.roomId;
        nextRoomCode = result.roomCode;
        assignedDisplayName = result.assignedDisplayName;
      } else {
        const result = await joinRoom({
          roomCode: joinCode,
          displayName: requestedName,
          avatarId: selectedAvatarId,
        });
        nextRoomId = result.roomId;
        nextRoomCode = result.roomId;
        assignedDisplayName = result.assignedDisplayName;
      }

      setRoomId(nextRoomId);
      setInviteRoomCode(null);
      setNoticeMessage(getAssignedNameNotice(requestedName, assignedDisplayName));
      setErrorMessage(null);
      router.replace(buildLiveRoomPath(nextRoomCode));
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

  async function handleCopyShareLink() {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedShareLink(true);
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

  if (roomId && (!room || !currentPlayer) && !showInGame && room?.status !== "ended") {
    return renderWithGlobalToast(
      <LobbyScreen
        copiedShareLink={false}
        currentPlayer={null}
        hostPlayerId={null}
        isLoading
        noticeMessage={null}
        onCopyShareLink={() => {}}
        onReadyToggle={() => {}}
        onStartGame={() => {}}
        pendingAction={null}
        players={[]}
        roomCode={roomId}
        showStartButton
        startDisabled
        statusMessage={null}
      />
    );
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
        onDismissStatusToast={() => {
          setErrorMessage(null);
          setAuthError(null);
        }}
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
        isLoading={false}
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
    <main className="toy-page min-h-screen px-[16px] py-[20px] sm:px-[24px] sm:py-[32px]">
      <div className="mx-auto flex w-full max-w-[1728px] flex-col gap-[16px] lg:gap-[20px]">
        <section className="toy-shell overflow-hidden rounded-[32px] px-[16px] py-[16px] sm:px-[24px] sm:py-[24px] lg:px-[28px] lg:py-[28px]">
          <div
            className="grid items-start gap-[16px] lg:grid-cols-[minmax(272px,0.72fr)_minmax(0,1.28fr)] lg:gap-[20px]"
          >
            <section className="space-y-[20px]">
              <div className="flex flex-wrap items-center justify-between gap-[12px]">
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
                    <h1 className="max-w-lg text-balance text-[clamp(31.2px,2.6vw,49.6px)] font-black uppercase leading-[0.94] tracking-[-0.045em] text-white drop-shadow-[0_3px_0_rgba(11,49,116,0.95)]">
                      {roomHeroTitle}
                    </h1>
                    <p className="mt-[12px] max-w-lg text-[14px] leading-[24px] text-[#d8ecff] sm:text-[15.2px] sm:leading-[28px]">
                      {roomHeroDescription}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="max-w-2xl text-balance text-[clamp(38.4px,4.2vw,64px)] font-black uppercase leading-[0.9] tracking-[-0.055em] text-white drop-shadow-[0_3px_0_rgba(11,49,116,0.95)]">
                      {roomHeroTitle}
                    </h1>
                    <p className="mt-[12px] max-w-xl text-[14px] leading-[24px] text-[#d8ecff] sm:text-[15.68px] sm:leading-[28px]">
                      {roomHeroDescription}
                    </p>
                  </>
                )}
              </div>

              {showCompactRoomSidebar && room && currentPlayer ? (
                <div className="toy-chip-panel rounded-[23.2px] p-[14px] lg:p-[16px]">
                  <div className="flex items-center gap-[12px]">
                    <div
                      className="avatar-orb flex size-[48px] items-center justify-center rounded-full text-[24px]"
                    >
                      <AvatarArt
                        avatar={getAvatarOption(currentPlayer.avatarId)}
                        className="avatar-image"
                        decorative
                      />
                    </div>
                    <div>
                      <p className="text-[16px] font-black uppercase text-white">
                        {currentPlayer.displayName}
                      </p>
                      <p className="text-[14px] text-[#d8ecff]">
                        {currentPlayer.playerId === room.hostPlayerId ? "Current host" : "Active player"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
                    <div className="phase-roster">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Room code
                      </p>
                      <p className="mt-[6px] text-[20px] font-black uppercase text-white">
                        {room.roomCode}
                      </p>
                    </div>
                    <div className="phase-roster">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Players
                      </p>
                      <p className="mt-[6px] text-[20px] font-black uppercase text-white">
                        {players.length}
                      </p>
                    </div>
                    <div className="phase-roster sm:col-span-2">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                        Current focus
                      </p>
                      <p className="mt-[6px] text-[18px] font-black uppercase text-white">
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
                          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Room state
                          </p>
                          <p className="mt-[6px] text-[20px] font-black uppercase text-white">
                            {roomStatusLabel}
                          </p>
                        </div>
                        <div className="phase-roster">
                          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Your state
                          </p>
                          <p className="mt-[6px] text-[20px] font-black uppercase text-white">
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
                          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#9ad9ff]">
                            Progress
                          </p>
                          <p className="mt-[6px] text-[18px] font-black uppercase text-white">
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

            <section className="toy-shell rounded-[27.2px] bg-[#0b3d95]/70 px-[16px] py-[16px] sm:px-[20px] lg:px-[24px]">
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
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-[16px] rounded-[24px] bg-[#082f76] px-[20px] py-[20px] ring-1 ring-white/10 lg:min-h-[384px]">
                  <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                    Syncing round
                  </p>
                  <p className="max-w-xl text-center text-[18px] leading-[32px] text-[#d8ecff]">
                    Room state is live. Waiting for the active player and round snapshot to settle.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col justify-between rounded-[24px] bg-[#082f76] px-[20px] py-[20px] ring-1 ring-white/10 lg:min-h-[384px]">
                  <div>
                    <p className="section-banner bg-linear-to-r from-[#59efff] to-[#4d8cff] text-[#14356b]">
                      How it works
                    </p>
                    <h2 className="mt-[20px] max-w-2xl text-[clamp(28px,2.6vw,44.8px)] font-black uppercase leading-[0.94] tracking-[-0.04em] text-white">
                      Pick a name, choose an avatar, and create or join with a code.
                    </h2>
                    <p className="mt-[16px] max-w-2xl text-[16px] leading-[28px] text-[#d8ecff] sm:text-[18px] sm:leading-[32px]">
                      Share links now open dedicated join routes like `/join/482901`.
                      Once you are in a lobby, the address switches to the live room
                      surface and continues into the timed round screens after start.
                    </p>
                  </div>

                  <div className="grid gap-[16px] xl:grid-cols-3">
                    <div className="toy-chip-panel rounded-[21.6px] px-[16px] py-[16px]">
                      <div className="score-pill max-w-fit">Step 1</div>
                      <p className="mt-[12px] text-[18px] font-black uppercase text-white">
                        Create a room or join with a six-digit code.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[21.6px] px-[16px] py-[16px]">
                      <div className="score-pill max-w-fit">Step 2</div>
                      <p className="mt-[12px] text-[18px] font-black uppercase text-white">
                        Ready up in the lobby and let the host start the session.
                      </p>
                    </div>
                    <div className="toy-chip-panel rounded-[21.6px] px-[16px] py-[16px]">
                      <div className="score-pill max-w-fit">Step 3</div>
                      <p className="mt-[12px] text-[18px] font-black uppercase text-white">
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
