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
import { Toast } from "@/components/toast";
import { EndGameScreen } from "@/components/end-game-screen";
import { GameSyncScreen } from "@/components/game-sync-screen";
import { ChoiceScreen } from "@/components/choice-screen";
import { LobbyScreen } from "@/components/lobby-screen";
import { MenuScreen } from "@/components/menu-screen";
import { RebuttalScreen } from "@/components/rebuttal-screen";
import { ResolutionScreen } from "@/components/resolution-screen";
import { TitleScreen } from "@/components/title-screen";
import { VerdictScreen } from "@/components/verdict-screen";
import { buildResolutionSummary } from "@/lib/session-summary";
import {
  DEFAULT_AVATAR_ID,
  getAvatarOption,
} from "@/lib/avatar-options";
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
  heartbeatRoom,
  isLostRoomMembershipError,
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
  buildJoinRoomPath,
  buildLiveRoomPath,
  getLobbyStartState,
  normalizeRoomCodeInput,
  parseRoomRouteState,
} from "@/lib/lobby-utils";
import { getHostPromotionNotice } from "@/lib/host-promotion";
import {
  ROOM_DISCONNECTED_MESSAGE,
  shouldEnterPresenceRecovery,
  shouldHandleLostRoomMembership,
  shouldMaintainRoomPresence,
} from "@/lib/room-presence";

type EntryMode = "create" | "join";
const SPLASH_MIN_DURATION_MS = 2000;
const ROOM_HEARTBEAT_INTERVAL_MS = 15_000;

type WannabeAppProps = {
  initialInviteRoomCode?: string | null;
  initialLiveRoomCode?: string | null;
  initialShowSplash?: boolean;
};

type AppRouter = {
  replace: ReturnType<typeof useRouter>["replace"];
};

export type WannabeAppDependencies = {
  advanceResolution: typeof advanceResolution;
  advanceRebuttal: typeof advanceRebuttal;
  createRoom: typeof createRoom;
  endArgumentTurn: typeof endArgumentTurn;
  getErrorMessage: typeof getErrorMessage;
  heartbeatRoom: typeof heartbeatRoom;
  isLostRoomMembershipError: typeof isLostRoomMembershipError;
  joinRoom: typeof joinRoom;
  leaveRoom: typeof leaveRoom;
  setReady: typeof setReady;
  startGame: typeof startGame;
  submitChoice: typeof submitChoice;
  submitVerdict: typeof submitVerdict;
  subscribeToAnonymousUser: typeof subscribeToAnonymousUser;
  subscribeToLobby: typeof subscribeToLobby;
  subscribeToRound: typeof subscribeToRound;
  tickRoom: typeof tickRoom;
};

type WannabeAppInnerProps = WannabeAppProps & {
  dependencies?: Partial<WannabeAppDependencies>;
  router: AppRouter;
};

const defaultDependencies: WannabeAppDependencies = {
  advanceResolution,
  advanceRebuttal,
  createRoom,
  endArgumentTurn,
  getErrorMessage,
  heartbeatRoom,
  isLostRoomMembershipError,
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
};

const PERMISSION_DENIED_MESSAGE_PATTERN = /Missing or insufficient permissions/i;

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
  return (
    <WannabeAppInner
      initialInviteRoomCode={initialInviteRoomCode}
      initialLiveRoomCode={initialLiveRoomCode}
      initialShowSplash={initialShowSplash}
      router={router}
    />
  );
}

export function WannabeAppInner({
  dependencies,
  initialInviteRoomCode = null,
  initialLiveRoomCode = null,
  initialShowSplash = true,
  router,
}: WannabeAppInnerProps) {
  const appDependencies = useMemo(
    () => ({
      ...defaultDependencies,
      ...dependencies,
    }),
    [dependencies],
  );
  const {
    advanceResolution: advanceResolutionAction,
    advanceRebuttal: advanceRebuttalAction,
    createRoom: createRoomAction,
    endArgumentTurn: endArgumentTurnAction,
    getErrorMessage: getErrorMessageForUi,
    heartbeatRoom: heartbeatRoomAction,
    isLostRoomMembershipError: isLostRoomMembershipErrorMatcher,
    joinRoom: joinRoomAction,
    leaveRoom: leaveRoomAction,
    setReady: setReadyAction,
    startGame: startGameAction,
    submitChoice: submitChoiceAction,
    submitVerdict: submitVerdictAction,
    subscribeToAnonymousUser: subscribeToAnonymousUserAction,
    subscribeToLobby: subscribeToLobbyAction,
    subscribeToRound: subscribeToRoundAction,
    tickRoom: tickRoomAction,
  } = appDependencies;
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showSplash, setShowSplash] = useState(initialShowSplash);
  const [splashProgress, setSplashProgress] = useState(initialShowSplash ? 0 : 1);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [dismissedHostPromotionKeys, setDismissedHostPromotionKeys] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isRecoveringPresence, setIsRecoveringPresence] = useState(false);
  const tickingPhaseKeyRef = useRef<string | null>(null);
  const hadActiveMembershipRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const usesInjectedRouteState = initialInviteRoomCode !== null || initialLiveRoomCode !== null;
  const currentPlayer = useMemo(
    () => players.find((player) => player.playerId === authUid) ?? null,
    [authUid, players],
  );
  const currentPlayerId = currentPlayer?.playerId ?? null;
  const resetToMain = useCallback((nextErrorMessage: string | null = null) => {
    setRoomId(null);
    setRoom(null);
    setRound(null);
    setLatestRound(null);
    setPlayers([]);
    setInviteRoomCode(null);
    setJoinCode("");
    setErrorMessage(nextErrorMessage);
    router.replace("/");
  }, [router]);

  const enterInviteRouteState = useCallback((nextRoomCode: string) => {
    const normalizedRoomCode = normalizeRoomCodeInput(nextRoomCode);

    setRoomId(null);
    setRoom(null);
    setRound(null);
    setLatestRound(null);
    setPlayers([]);
    setInviteRoomCode(normalizedRoomCode || null);
    setJoinCode(normalizedRoomCode);
    setErrorMessage(null);
    router.replace(buildJoinRoomPath(normalizedRoomCode));
  }, [router]);

  const enterLiveRouteState = useCallback((nextRoomCode: string) => {
    const normalizedRoomCode = normalizeRoomCodeInput(nextRoomCode);

    setInviteRoomCode(null);
    setJoinCode("");
    setRoomId(normalizedRoomCode || null);
    setErrorMessage(null);
    router.replace(buildLiveRoomPath(normalizedRoomCode));
  }, [router]);

  const handleReturnToMain = useCallback(async (nextErrorMessage: string | null = null) => {
    const activeRoomId = roomId;
    const shouldLeave = Boolean(activeRoomId && currentPlayer && room?.status !== "ended");
    let message = nextErrorMessage;

    if (shouldLeave && activeRoomId) {
      try {
        await leaveRoomAction({ roomId: activeRoomId });
      } catch (error) {
        if (!isLostRoomMembershipErrorMatcher(error)) {
          message = getErrorMessageForUi(error);
        }
      }
    }

    resetToMain(message);
  }, [
    currentPlayer,
    getErrorMessageForUi,
    isLostRoomMembershipErrorMatcher,
    leaveRoomAction,
    resetToMain,
    room?.status,
    roomId,
  ]);

  const handleRoomActionError = useCallback((error: unknown) => {
    if (isLostRoomMembershipErrorMatcher(error)) {
      void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
      return;
    }

    setErrorMessage(getErrorMessageForUi(error));
  }, [getErrorMessageForUi, handleReturnToMain, isLostRoomMembershipErrorMatcher]);

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
      return subscribeToAnonymousUserAction(
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
      setAuthError(getErrorMessageForUi(error));
      return undefined;
    }
  }, [getErrorMessageForUi, subscribeToAnonymousUserAction]);

  useEffect(() => {
    if (usesInjectedRouteState || typeof window === "undefined") {
      return undefined;
    }

    const syncFromLocation = () => {
      const nextRouteState = parseRoomRouteState(window.location.search);
      setInviteRoomCode(nextRouteState.inviteRoomCode);
      setJoinCode(nextRouteState.inviteRoomCode ?? "");
      setRoomId(nextRouteState.liveRoomCode);
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [usesInjectedRouteState]);

  useEffect(() => {
    if (!roomId || !authUid) {
      setRoom(null);
      setPlayers([]);
      setRound(null);
      setLatestRound(null);
      setDismissedHostPromotionKeys([]);
      return undefined;
    }

    try {
      return subscribeToLobbyAction(roomId, {
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
            if (
              hadActiveMembershipRef.current &&
              PERMISSION_DENIED_MESSAGE_PATTERN.test(message)
            ) {
              void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
              return;
            }
            setErrorMessage(message);
          });
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessageForUi(error));
      return undefined;
    }
  }, [authUid, getErrorMessageForUi, handleReturnToMain, roomId, subscribeToLobbyAction]);

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
      return subscribeToRoundAction(roomId, room.roundIndex, {
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
      setErrorMessage(getErrorMessageForUi(error));
      return undefined;
    }
  }, [authUid, getErrorMessageForUi, room?.roundIndex, room?.status, roomId, subscribeToRoundAction]);

  useEffect(() => {
    if (!validationNotice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setValidationNotice(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [validationNotice]);

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

  useEffect(() => {
    if (!roomId) {
      hadActiveMembershipRef.current = false;
      wasHiddenRef.current = false;
      setIsRecoveringPresence(false);
      return;
    }

    if (currentPlayer) {
      hadActiveMembershipRef.current = true;
      return;
    }

    if (
      !shouldHandleLostRoomMembership({
        roomId,
        roomStatus: room?.status,
        hasRoom: Boolean(room),
        currentPlayerId: null,
        hadActiveMembership: hadActiveMembershipRef.current,
      })
    ) {
      return;
    }

    void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
  }, [currentPlayer, handleReturnToMain, room, roomId]);

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
    if (
      !roomId ||
      !authUid ||
      room ||
      currentPlayer ||
      errorMessage !== "Room is no longer available."
    ) {
      return;
    }

    enterInviteRouteState(roomId);
  }, [authUid, currentPlayer, enterInviteRouteState, errorMessage, room, roomId]);

  const sendRoomHeartbeat = useCallback(async () => {
    const activeRoomId = roomId;
    if (!activeRoomId) {
      return;
    }

    if (
      !shouldMaintainRoomPresence({
        roomId: activeRoomId,
        roomStatus: room?.status,
        currentPlayerId,
      })
    ) {
      return;
    }

    try {
      await heartbeatRoomAction({ roomId: activeRoomId });
    } catch (error) {
      handleRoomActionError(error);
    }
  }, [currentPlayerId, handleRoomActionError, heartbeatRoomAction, room?.status, roomId]);

  useEffect(() => {
    if (
      !shouldMaintainRoomPresence({
        roomId,
        roomStatus: room?.status,
        currentPlayerId,
      })
    ) {
      return undefined;
    }

    void sendRoomHeartbeat();
    const interval = window.setInterval(() => {
      void sendRoomHeartbeat();
    }, ROOM_HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [currentPlayerId, room?.status, roomId, sendRoomHeartbeat]);

  useEffect(() => {
    if (
      !shouldMaintainRoomPresence({
        roomId,
        roomStatus: room?.status,
        currentPlayerId,
      })
    ) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        void sendRoomHeartbeat();
        return;
      }

      if (
        !shouldEnterPresenceRecovery({
          wasHidden: wasHiddenRef.current,
          isVisible: document.visibilityState === "visible",
          roomId,
          roomStatus: room?.status,
          currentPlayerId,
        })
      ) {
        return;
      }

      const activeRoomId = roomId;
      if (!activeRoomId) {
        return;
      }

      wasHiddenRef.current = false;
      setIsRecoveringPresence(true);

      void (async () => {
        try {
          await heartbeatRoomAction({ roomId: activeRoomId });
          setIsRecoveringPresence(false);
        } catch (error) {
          if (isLostRoomMembershipErrorMatcher(error)) {
            void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
            return;
          }

          setIsRecoveringPresence(false);
          handleRoomActionError(error);
        }
      })();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    currentPlayerId,
    handleReturnToMain,
    handleRoomActionError,
    heartbeatRoomAction,
    isLostRoomMembershipErrorMatcher,
    room?.status,
    roomId,
    sendRoomHeartbeat,
  ]);

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

    void handleReturnToMain();
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
          <Toast
            className="toast-fixed"
            closeLabel="Dismiss notification"
            message={visibleHostPromotionNotice.message}
            onDismiss={dismissHostPromotionNotice}
            variant="success"
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
      await tickRoomAction({ roomId });
    } catch (error) {
      handleRoomActionError(error);
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
      !currentPlayer ||
      isRecoveringPresence
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
    isRecoveringPresence,
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
      if (mode === "create") {
        const result = await createRoomAction({
          displayName: requestedName,
          avatarId: selectedAvatarId,
        });
        nextRoomId = result.roomId;
        nextRoomCode = result.roomCode;
      } else {
        const result = await joinRoomAction({
          roomCode: joinCode,
          displayName: requestedName,
          avatarId: selectedAvatarId,
        });
        nextRoomId = result.roomId;
        nextRoomCode = result.roomId;
      }

      setRoomId(nextRoomId);
      enterLiveRouteState(nextRoomCode);
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReadyToggle(nextReady: boolean) {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction("ready");
    setErrorMessage(null);

    try {
      await setReadyAction({ roomId, ready: nextReady });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStartGame() {
    if (!roomId || !startState.canStart || isRecoveringPresence) {
      return;
    }

    setPendingAction("start");
    setErrorMessage(null);

    try {
      await startGameAction({ roomId });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmitChoice(side: "A" | "B") {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction(`choice-${side}`);
    setErrorMessage(null);

    try {
      await submitChoiceAction({ roomId, side });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEndArgumentTurn() {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction("end-turn");
    setErrorMessage(null);

    try {
      await endArgumentTurnAction({ roomId });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAdvanceRebuttal() {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction("advance-rebuttal");
    setErrorMessage(null);

    try {
      await advanceRebuttalAction({ roomId });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmitVerdict(verdict: "A_WON" | "B_WON" | "DRAW") {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction(`verdict-${verdict}`);
    setErrorMessage(null);

    try {
      await submitVerdictAction({ roomId, verdict });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAdvanceResolution() {
    if (!roomId || isRecoveringPresence) {
      return;
    }

    setPendingAction("advance-resolution");
    setErrorMessage(null);

    try {
      await advanceResolutionAction({ roomId });
    } catch (error) {
      handleRoomActionError(error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEndGameReturnToMain() {
    if (!roomId || isRecoveringPresence) {
      void handleReturnToMain();
      return;
    }

    const isFinalRoundResolutionHost =
      room?.status === "inGame" &&
      room.phase === "resolution" &&
      currentPlayer?.playerId === room.hostPlayerId;

    if (!isFinalRoundResolutionHost) {
      void handleReturnToMain();
      return;
    }

    setPendingAction("advance-resolution");
    setErrorMessage(null);

    try {
      await advanceResolutionAction({ roomId });
      resetToMain();
    } catch (error) {
      handleRoomActionError(error);
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
        onCopyShareLink={() => {}}
        onReadyToggle={() => {}}
        onStartGame={() => {}}
        pendingAction={null}
        players={[]}
        roomCode={roomId}
        showStartButton
        startDisabled
      />
    );
  }

  if (!roomId || !room || !currentPlayer) {
    return (
      <MenuScreen
        authError={authError}
        createDisabled={Boolean(pendingAction || authError)}
        createPending={pendingAction === "create"}
        displayName={displayName}
        errorMessage={errorMessage}
        inviteRoomCode={inviteRoomCode}
        isAvatarPickerOpen={isAvatarPickerOpen}
        joinCode={joinCode}
        joinDisabled={Boolean(pendingAction || authError)}
        joinPending={pendingAction === "join"}
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
        onCopyShareLink={() => void handleCopyShareLink()}
        onReadyToggle={() => void handleReadyToggle(!currentPlayer.ready)}
        onStartGame={() => void handleStartGame()}
        pendingAction={pendingAction}
        players={players}
        roomCode={room.roomCode}
        showStartButton={currentPlayer.playerId === room.hostPlayerId}
        startDisabled={!startState.canStart || pendingAction === "start"}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "choice") {
    return renderWithGlobalToast(
      <ChoiceScreen
        currentPlayer={currentPlayer}
        nowMs={nowMs}
        onSubmitChoice={(side) => void handleSubmitChoice(side)}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "argument") {
    return renderWithGlobalToast(
      <ArgumentScreen
        currentPlayer={currentPlayer}
        nowMs={nowMs}
        onEndArgumentTurn={() => void handleEndArgumentTurn()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "rebuttal") {
    return renderWithGlobalToast(
      <RebuttalScreen
        currentPlayer={currentPlayer}
        nowMs={nowMs}
        onAdvanceRebuttal={() => void handleAdvanceRebuttal()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
      />
    );
  }

  if (showInGame && room && currentPlayer && room.phase === "verdict") {
    return renderWithGlobalToast(
      <VerdictScreen
        currentPlayer={currentPlayer}
        nowMs={nowMs}
        onSubmitVerdict={(verdict) => void handleSubmitVerdict(verdict)}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
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
        />
      );
    }

    return renderWithGlobalToast(
      <ResolutionScreen
        currentPlayer={currentPlayer}
        onAdvanceResolution={() => void handleAdvanceResolution()}
        pendingAction={pendingAction}
        players={players}
        room={room}
        round={round}
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
      />
    );
  }

  if (roomId && room?.status === "inGame") {
    return renderWithGlobalToast(
      <GameSyncScreen />,
    );
  }

  return (
    <MenuScreen
      authError={authError}
      createDisabled={Boolean(pendingAction || authError)}
      createPending={pendingAction === "create"}
      displayName={displayName}
      errorMessage={errorMessage}
      inviteRoomCode={inviteRoomCode}
      isAvatarPickerOpen={isAvatarPickerOpen}
      joinCode={joinCode}
      joinDisabled={Boolean(pendingAction || authError)}
      joinPending={pendingAction === "join"}
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
