import { expect, test, type Page } from "@playwright/test";

import { createRoomFromEntry, waitForEntrySurface } from "./helpers/game";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1024 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.locator("body").evaluate(() => {
    return Math.max(
      document.body.scrollWidth - window.innerWidth,
      document.documentElement.scrollWidth - window.innerWidth,
    );
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

for (const viewport of VIEWPORTS) {
  test(`entry screen stays usable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await waitForEntrySurface(page);

    await expect(page.getByRole("heading", { name: /^wannabe!$/i })).toBeVisible();
    await expect(page.getByText(/^Be someone!$/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /display name/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^create room$/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`lobby screen stays usable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const playerName = `Alex ${viewport.name}`;
    const { roomCode } = await createRoomFromEntry(page, playerName);

    await expect(page.getByText(new RegExp(`^Room ${roomCode} Lobby$`, "i"))).toBeVisible();
    await expect(page.getByRole("button", { name: /mark ready/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /share link|copied/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`invite screen stays usable at ${viewport.name} width`, async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const { roomCode } = await createRoomFromEntry(hostPage, `Host ${viewport.name}`);

    const inviteContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const invitePage = await inviteContext.newPage();

    await invitePage.goto(`/join/${roomCode}`);
    await waitForEntrySurface(invitePage);

    await expect(invitePage.getByText(new RegExp(`^Room ${roomCode}$`, "i"))).toBeVisible();
    await expect(invitePage.getByRole("button", { name: /^join your friends$/i })).toBeVisible();
    await expect(invitePage.getByRole("textbox", { name: /room code/i })).toHaveCount(0);
    await expectNoHorizontalOverflow(invitePage);

    await inviteContext.close();
    await hostContext.close();
  });
}
