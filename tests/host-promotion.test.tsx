import assert from "node:assert/strict";
import test from "node:test";

import { fireEvent, render } from "@testing-library/react";

import { AppToast } from "@/components/app-toast";
import { getHostPromotionNotice } from "@/lib/host-promotion";

import { setupReactTestEnv } from "./react-test-env";

setupReactTestEnv();

test("getHostPromotionNotice only returns a toast for the promoted host", () => {
  const room = {
    hostPlayerId: "alice",
    hostPromotionNonce: 2,
    lastPromotedHostPlayerId: "alice",
    roomId: "room-1",
  };

  assert.deepEqual(
    getHostPromotionNotice({
      currentPlayerId: "alice",
      room,
    }),
    {
      key: "room-1:host-promotion:2",
      message: "You're now promoted to host",
    },
  );

  assert.equal(
    getHostPromotionNotice({
      currentPlayerId: "bob",
      room,
    }),
    null,
  );

  assert.equal(
    getHostPromotionNotice({
      currentPlayerId: "alice",
      room: {
        ...room,
        hostPlayerId: "bob",
      },
    }),
    null,
  );
});

test("AppToast renders the promotion copy and supports dismissal", () => {
  let dismissed = 0;
  const view = render(
    <AppToast
      closeLabel="Dismiss notification"
      message="You're now promoted to host"
      onDismiss={() => {
        dismissed += 1;
      }}
      variant="success"
    />,
  );

  assert.match(
    view.getByRole("alert").textContent ?? "",
    /you're now promoted to host/i,
  );

  fireEvent.click(view.getByRole("button", { name: /dismiss notification/i }));
  assert.equal(dismissed, 1);
});
