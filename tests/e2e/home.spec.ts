import { expect, test } from "@playwright/test";

import { createRoomFromEntry, waitForEntrySurface } from "./helpers/game";

test("splash resolves into the redesigned main entry surface", async ({ page }) => {
  await page.goto("/");
  await waitForEntrySurface(page);

  await expect(page.getByRole("heading", { name: /^wannabe!$/i })).toBeVisible();
  await expect(page.getByText(/^Be someone!$/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /display name/i })).toHaveAttribute(
    "placeholder",
    "Enter your name",
  );
  await expect(page.getByRole("textbox", { name: /room code/i })).toHaveAttribute(
    "placeholder",
    "ROOM CODE",
  );
  await expect(page.getByRole("button", { name: /^create room$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^join room$/i })).toBeVisible();
});

test("share-link entry opens the dedicated invite join screen", async ({ page }) => {
  await page.goto("/join/123456");
  await waitForEntrySurface(page);

  await expect(page.getByText(/you.?re invited to join/i)).toBeVisible();
  await expect(page.getByText(/^Room 123456$/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^join your friends$/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /room code/i })).toHaveCount(0);
});

test("refreshing a live room route restores the lobby instead of dropping to join mode", async ({
  page,
}) => {
  const { roomCode } = await createRoomFromEntry(page, "Host");

  await expect(page).toHaveURL(new RegExp(`/rooms/${roomCode}$`, "i"));
  await page.reload();

  await expect(page.getByText(new RegExp(`^Room ${roomCode} Lobby$`, "i")).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^join your friends$/i })).toHaveCount(0);
});
