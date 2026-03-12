const ROOM_CODE_QUERY_KEY = "room";

/**
 * @typedef {{
 *   playerId: string;
 *   ready: boolean;
 * }} LobbyPlayer
 */

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeRoomCodeInput(value) {
  return value.replace(/\D/g, "").slice(0, 6);
}

/**
 * @param {string} roomCode
 * @returns {string}
 */
export function buildRoomShareQuery(roomCode) {
  const normalized = normalizeRoomCodeInput(roomCode);
  return normalized ? `/?${ROOM_CODE_QUERY_KEY}=${normalized}` : "/";
}

/**
 * @param {string} origin
 * @param {string} roomCode
 * @returns {string}
 */
export function buildRoomShareLink(origin, roomCode) {
  return new URL(buildRoomShareQuery(roomCode), origin).toString();
}

/**
 * @param {string} search
 * @returns {string}
 */
export function extractRoomCodeFromSearch(search) {
  const params = new URLSearchParams(search);
  return normalizeRoomCodeInput(params.get(ROOM_CODE_QUERY_KEY) ?? "");
}

/**
 * @param {{
 *   currentPlayerId: string | null;
 *   hostPlayerId: string | null;
 *   players: LobbyPlayer[];
 * }} params
 */
export function getLobbyStartState({
  currentPlayerId,
  hostPlayerId,
  players,
}) {
  const isHost = Boolean(currentPlayerId && hostPlayerId && currentPlayerId === hostPlayerId);
  const everyoneReady = players.length > 0 && players.every((player) => player.ready);

  if (!isHost) {
    return {
      canStart: false,
      reason: "Only the host can start the game.",
    };
  }

  if (players.length < 2) {
    return {
      canStart: false,
      reason: "At least two players are required.",
    };
  }

  if (!everyoneReady) {
    return {
      canStart: false,
      reason: "Everyone needs to be ready first.",
    };
  }

  return {
    canStart: true,
    reason: "Ready to start.",
  };
}

/**
 * @param {string} requestedName
 * @param {string} assignedName
 * @returns {string | null}
 */
export function getAssignedNameNotice(requestedName, assignedName) {
  if (
    typeof requestedName !== "string" ||
    typeof assignedName !== "string" ||
    requestedName.trim().length === 0 ||
    requestedName === assignedName
  ) {
    return null;
  }

  return `Joined as ${assignedName}.`;
}
