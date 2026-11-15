import { expect } from "@playwright/test"
import { AUTH_UI_READY, E2E_PASSWORD, test } from "../fixtures/auth"

// REGISTER USER JOURNEY — scaffolding while the auth pages don't exist.
//
// data-testid contract to implement in the register page:
//   - register-name, register-email, register-password, register-submit
//   - register-success: shown once the user is created and logged in
//     (API contract: POST /api/v1/auth/register → 200 + AuthResponse).
test.skip(!AUTH_UI_READY, "Pages d'auth non implémentées (contrat data-testid : voir fixtures/auth.ts)")

test("register: form submits and shows the logged-in state", async ({ page, authApi }) => {
  const email = authApi.uniqueEmail()

  await page.goto("/")
  await page.getByTestId("register-name").fill("E2E Register")
  await page.getByTestId("register-email").fill(email)
  await page.getByTestId("register-password").fill(E2E_PASSWORD)
  await page.getByTestId("register-submit").click()

  await expect(page.getByTestId("register-success")).toBeVisible()
})
