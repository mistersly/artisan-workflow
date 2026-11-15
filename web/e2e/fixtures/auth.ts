import { expect, test as base, type APIResponse } from "@playwright/test"

// Single source of truth gating the auth E2E specs.
// Flip to `true` once the auth pages exist and implement the data-testid
// selectors they expect (contract documented in each spec; see README
// "Tests"). While false, the auth specs report as skipped.
export const AUTH_UI_READY = false

// Password fixture valid against the API contract (min 6 chars).
export const E2E_PASSWORD = "Passw0rd!e2e"

type UserData = {
  id: number
  name: string
  email: string
}

type SessionTokens = {
  accessToken: string
  refreshToken: string
  user: UserData
}

type AuthApi = {
  register: (name: string, email: string, password?: string) => Promise<SessionTokens>
  login: (email: string, password?: string) => Promise<SessionTokens>
  me: (accessToken: string) => Promise<UserData>
  logout: (accessToken: string) => Promise<void>
  uniqueEmail: () => string
}

type AuthFixtures = {
  authApi: AuthApi
}

async function expectStatus(res: APIResponse, status: number, action: string): Promise<void> {
  if (res.status() === status) {
    return
  }
  let detail = ""
  try {
    const body = await res.json()
    detail = body?.error?.message ?? JSON.stringify(body)
  } catch {
    detail = res.statusText()
  }
  throw new Error(`${action} expected HTTP ${status} but got ${res.status()}: ${detail}`)
}

export const test = base.extend<AuthFixtures>({
  // Auth API helpers hitting the Go API through the frontend Vite proxy
  // (full-stack path), so the E2E run never needs the API address directly.
  // Uses the built-in request context (request.newContext({ baseURL })),
  // i.e. the same baseURL as the browser.
  authApi: async ({ request }, use) => {
    const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` })

    const authApi: AuthApi = {
      // register → 200 + AuthResponse { access_token, refresh_token, user }.
      // 409 means the email is already taken.
      async register(name, email, password = E2E_PASSWORD) {
        const res = await request.post("/api/v1/auth/register", {
          data: { name, email, password },
        })
        await expectStatus(res, 200, `register ${email}`)
        const { data } = await res.json()
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        }
      },
      // login → 200 + AuthResponse; 401 on invalid credentials.
      async login(email, password = E2E_PASSWORD) {
        const res = await request.post("/api/v1/auth/login", { data: { email, password } })
        await expectStatus(res, 200, `login ${email}`)
        const { data } = await res.json()
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        }
      },
      // me → 200 + UserResponse (Bearer access token).
      async me(accessToken) {
        const res = await request.get("/api/v1/auth/me", { headers: bearer(accessToken) })
        await expectStatus(res, 200, "get /auth/me")
        const { data } = await res.json()
        return data
      },
      // logout → 200 (Bearer access token).
      async logout(accessToken) {
        const res = await request.post("/api/v1/auth/logout", { headers: bearer(accessToken) })
        await expectStatus(res, 200, "logout")
      },
      // TLD .test is reserved (RFC 2606): emails stay out of real mail domains.
      // Uniqueness avoids polluting the dev DB with colliding users.
      uniqueEmail() {
        return `e2e-${Date.now()}-${crypto.randomUUID()}@e2e.test`
      },
    }

    await use(authApi)
  },
})

export { expect }
