import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1024 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.locator("main").evaluate((node) => {
    const element = node as HTMLElement;
    return Math.max(
      element.scrollWidth - element.clientWidth,
      document.documentElement.scrollWidth - window.innerWidth,
    );
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

for (const viewport of VIEWPORTS) {
  test(`entry surface stays usable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /launch the room\. then play the full session in real time\./i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /display name/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^create room$/i }).nth(1)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`lobby surface stays usable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByText("Ready").first()).toBeVisible();
    await page.getByRole("textbox", { name: /display name/i }).fill(`Alex ${viewport.name}`);
    await page.getByRole("button", { name: /^create room$/i }).nth(1).click();

    await expect(page.getByText(/^Lobby$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /mark ready/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
