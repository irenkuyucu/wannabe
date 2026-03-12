import { expect, test } from "@playwright/test";

test("main entry surface renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /launch the room\. then play the full session in real time\./i,
    }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: /create room/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /join room/i }).first()).toBeVisible();
  await expect(page.getByText(/pick a name, choose an avatar/i)).toBeVisible();
});
