import assert from "node:assert/strict";
import test from "node:test";

import {
  ROOM_DISCONNECTED_MESSAGE,
  shouldEnterPresenceRecovery,
  shouldHandleLostRoomMembership,
  shouldMaintainRoomPresence,
} from "../src/lib/room-presence.ts";

test("shouldMaintainRoomPresence only stays active for a current member in a non-ended room", () => {
  assert.equal(
    shouldMaintainRoomPresence({
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: "host",
    }),
    true,
  );
  assert.equal(
    shouldMaintainRoomPresence({
      roomId: "123456",
      roomStatus: "inGame",
      currentPlayerId: "host",
    }),
    true,
  );
  assert.equal(
    shouldMaintainRoomPresence({
      roomId: "123456",
      roomStatus: "ended",
      currentPlayerId: "host",
    }),
    false,
  );
  assert.equal(
    shouldMaintainRoomPresence({
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: null,
    }),
    false,
  );
});

test("shouldHandleLostRoomMembership only disconnects after an active membership disappears from a live room", () => {
  assert.equal(
    shouldHandleLostRoomMembership({
      roomId: "123456",
      roomStatus: "lobby",
      hasRoom: true,
      currentPlayerId: null,
      hadActiveMembership: true,
    }),
    true,
  );
  assert.equal(
    shouldHandleLostRoomMembership({
      roomId: "123456",
      roomStatus: "ended",
      hasRoom: true,
      currentPlayerId: null,
      hadActiveMembership: true,
    }),
    false,
  );
  assert.equal(
    shouldHandleLostRoomMembership({
      roomId: "123456",
      roomStatus: "lobby",
      hasRoom: false,
      currentPlayerId: null,
      hadActiveMembership: true,
    }),
    false,
  );
  assert.equal(
    shouldHandleLostRoomMembership({
      roomId: "123456",
      roomStatus: "lobby",
      hasRoom: true,
      currentPlayerId: "host",
      hadActiveMembership: true,
    }),
    false,
  );
  assert.match(ROOM_DISCONNECTED_MESSAGE, /removed from the room due to inactivity/i);
});

test("shouldEnterPresenceRecovery only returns true for a visible tab resuming active room membership", () => {
  assert.equal(
    shouldEnterPresenceRecovery({
      wasHidden: true,
      isVisible: true,
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: "host",
    }),
    true,
  );
  assert.equal(
    shouldEnterPresenceRecovery({
      wasHidden: false,
      isVisible: true,
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: "host",
    }),
    false,
  );
  assert.equal(
    shouldEnterPresenceRecovery({
      wasHidden: true,
      isVisible: false,
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: "host",
    }),
    false,
  );
  assert.equal(
    shouldEnterPresenceRecovery({
      wasHidden: true,
      isVisible: true,
      roomId: "123456",
      roomStatus: "ended",
      currentPlayerId: "host",
    }),
    false,
  );
  assert.equal(
    shouldEnterPresenceRecovery({
      wasHidden: true,
      isVisible: true,
      roomId: "123456",
      roomStatus: "lobby",
      currentPlayerId: null,
    }),
    false,
  );
});
