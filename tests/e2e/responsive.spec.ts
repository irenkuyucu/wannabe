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

    await expect(page.getByText(new RegExp(`^Room ${roomCode}$`, "i"))).toBeVisible();
    await expect(page.getByRole("button", { name: /mark ready/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /share link|copied/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
