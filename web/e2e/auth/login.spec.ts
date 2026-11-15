import { expect } from "@playwright/test"
import { AUTH_UI_READY, E2E_PASSWORD, test } from "../fixtures/auth"

// LOGIN USER JOURNEY — scaffolding while the auth pages don't exist.
//
// data-testid contract to implement in the login page:
//   - login-email, login-password, login-submit
//   - login-success: shown once logged in
//   - login-error: shown on failure, carrying the API error message
//     (invalid credentials → 401 { success: false, error: { message } }).
test.skip(!AUTH_UI_READY, "Pages d'auth non implémentées (contrat data-testid : voir fixtures/auth.ts)")

test("login: valid credentials show the logged-in state", async ({ page, authApi }) => {
  const email = authApi.uniqueEmail()
  await authApi.register("E2E Login", email)

  await page.goto("/")
  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(E2E_PASSWORD)
  await page.getByTestId("login-submit").click()

  await expect(page.getByTestId("login-success")).toBeVisible()
})

test("login: invalid credentials show the API error message", async ({ page, authApi }) => {
  const email = authApi.uniqueEmail()
  await authApi.register("E2E Login fail", email)

  await page.goto("/")
  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill("definitely-wrong")
  await page.getByTestId("login-submit").click()

  await expect(page.getByTestId("login-error")).toBeVisible()
})
