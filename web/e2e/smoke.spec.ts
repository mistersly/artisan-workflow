import { expect, test } from "@playwright/test"

// Active smoke test validating the E2E harness (browser + Vite dev server).
// ⚠️ The asserted heading is template content: when App.tsx is reworked,
// replace it with a stable marker of the real app.
test.describe("Smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: /get started/i })).toBeVisible()
  })
})
