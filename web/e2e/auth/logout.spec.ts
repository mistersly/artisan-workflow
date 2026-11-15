import { expect } from "@playwright/test"
import { AUTH_UI_READY, E2E_PASSWORD, test } from "../fixtures/auth"

// LOGOUT USER JOURNEY — scaffolding while the auth pages don't exist.
//
// data-testid contract to implement:
//   - login-email, login-password, login-submit (login page)
//   - logout-button (authenticated UI)
//   - a protected route (e.g. /dashboard) redirecting to the login page
//     when unauthenticated.
test.skip(!AUTH_UI_READY, "Pages d'auth non implémentées (contrat data-testid : voir fixtures/auth.ts)")

test("logout: signs out and protects resources again", async ({ page, authApi }) => {
  const email = authApi.uniqueEmail()
  await authApi.register("E2E Logout", email)

  await page.goto("/")
  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(E2E_PASSWORD)
  await page.getByTestId("login-submit").click()
  await expect(page.getByTestId("login-success")).toBeVisible()

  await page.getByTestId("logout-button").click()

  await page.goto("/dashboard")
  await expect(page.getByTestId("login-submit")).toBeVisible()
})
