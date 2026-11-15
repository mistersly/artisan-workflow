# Plan d'intégration Web : react-router + Zustand + TanStack Query

## Objectif

Intégrer les 3 librairies dans `web/` en branchant un flux d'auth réel (login → session → `/dashboard` protégé → logout) sur l'API GRAB existante, en respectant l'existant : composant `Login` actuel (props `onSubmit`/`onCreateOrg`), proxy Vite déjà en place, contrat data-testid e2e déjà spécifié.

## Périmètre

**Inclus**
- Dépendances : `react-router` (v7), `zustand` (v5), `@tanstack/react-query` (v5) via npm (`web/package-lock.json` → npm, pas pnpm/yarn)
- Store d'auth Zustand persisté avec sémantique « Rester connecté » : `remember=true` → localStorage, sinon sessionStorage
- Client API typé (fetch, format réponse GRAB `{success, data, error}`)
- Login branché sur `POST /api/v1/auth/login`, logout sur `POST /api/v1/auth/logout` (via `useMutation`)
- Router : `/` = login (redirige vers `/dashboard` si authentifié), `/dashboard` protégé, `*` → `/`
- data-testid e2e posés sur le login existant + dashboard (`login-success`, `logout-button`)
- Tests unitaires (store, api-client, pages) + mise à jour du smoke e2e

**Exclu (suivis)**
- Page register + flip `AUTH_UI_READY=true` (web/e2e/fixtures/auth.ts:7) — le composant actuel a une vue « créer une organisation », pas un register
- Interceptor de rotation refresh token (401 → logout immédiat dans ce plan)
- Intégration du kanban (web/src/components/reui/kanban.tsx) sur /dashboard — placeholder pour l'instant
- Câblage de `onCreateOrg`

## Contrats & contraintes existantes (vérifiés)

- **API** : login `POST /api/v1/auth/login` `{email, password}` → 200 `{success, data:{access_token, refresh_token, token_type, expires_in, user:{id,name,email,roles,...}}}` (snake_case, web/e2e/fixtures/auth.ts:74, internal/user/dto.go:33) ; 401 invalid credentials → `{success:false, error:{message}}`
- **Logout** : `POST /api/v1/auth/logout` avec `Authorization: Bearer` (internal/server/router.go:87)
- **Proxy** : `/api` → `http://localhost:8180` déjà configuré (web/vite.config.ts:20) — rien à faire
- **TS strict** : `erasableSyntaxOnly` (pas de parameter properties ni enums — écrire `class ApiError { status: number; constructor(...) }` avec champ déclaré), `verbatimModuleSyntax` (`import type` obligatoire), alias `@/*` → `src/*`
- **e2e** : specs auth skippées tant que `AUTH_UI_READY=false` (ne pas flipper) ; smoke e2e référence un heading template obsolète à remplacer (web/e2e/smoke.spec.ts:9 + commentaire)
- **Tests** : vitest globals `describe/it/expect` sans import, jsdom, setup `@testing-library/jest-dom/vitest` ; lint oxlint (ignore `e2e/**`)
- **Makefile** : `make web-lint`, `make web-test`, `make web-build`, `make web-e2e`

## Décisions actées

1. react-router v7 **mode library** (`createBrowserRouter` + `RouterProvider`, imports depuis `react-router`)
2. « Rester connecté » honorée : 2 storages via `persist.setOptions` + bootstrap de réhydratation
3. Rotation refresh : hors périmètre ; 401 → clear session → le garde réactif bascule sur `/`
4. `App.tsx` conservé comme racine de composition (providers + router) ; `main.tsx` inchangé → `App.test.tsx` reste valable (URL jsdom `/` → login non authentifié)
5. Pages dans `src/pages/` (kebab-case, convention existante), store dans `src/stores/`, API dans `src/lib/`

## Tâches

### T1 — Installation
```bash
cd web && npm install react-router zustand @tanstack/react-query
```
(versions majeures : react-router 7.x, zustand 5.x, @tanstack/react-query 5.x)

### T2 — Store d'auth : `web/src/stores/auth-store.ts`

```ts
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

const AUTH_STORAGE_KEY = "atrium-auth"

export interface AuthUser { id: number; name: string; email: string; roles: string[] }
export interface Session { accessToken: string; refreshToken: string; user: AuthUser }

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (session: Session, remember: boolean) => void
  logout: () => void
}

// Toujours purger les DEUX storages (login ET logout) pour éviter
// une session fantôme dans l'autre storage.
function clearAuthStorages() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (session, remember) => {
        clearAuthStorages()
        useAuthStore.persist.setOptions({
          storage: createJSONStorage(() =>
            remember ? localStorage : sessionStorage,
          ),
        })
        set(session)
      },
      logout: () => {
        clearAuthStorages()
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    { name: AUTH_STORAGE_KEY, storage: createJSONStorage(() => localStorage) },
  ),
)

// Bootstrap (exécuté au chargement du module) : réhydrater depuis
// sessionStorage si localStorage est vide (session "non-remember"
// issue d'un onglet/chargement précédent).
if (
  localStorage.getItem(AUTH_STORAGE_KEY) === null &&
  sessionStorage.getItem(AUTH_STORAGE_KEY) !== null
) {
  useAuthStore.persist.setOptions({
    storage: createJSONStorage(() => sessionStorage),
  })
  void useAuthStore.persist.rehydrate()
}
```

Notes :
- Ordre important : `clearAuthStorages()` + `setOptions` **avant** `set()` pour que l'écriture atterrisse dans le bon storage
- `partialize` non nécessaire si le store ne contient que data + fonctions (zustand persist n'écrit que les valeurs sérialisables ; on peut ajouter `partialize` explicite pour être verbeux — au choix de l'implémenteur, documenter)
- Hors React : `useAuthStore.getState()` / `useAuthStore.getState().logout()`

### T3 — Client API : `web/src/lib/api-client.ts`

```ts
import { useAuthStore } from "@/stores/auth-store"

const API_BASE = "/api/v1"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken } = useAuthStore.getState()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })

  const body = res.status === 204 ? null : await res.json().catch(() => null)

  if (res.status === 401) {
    useAuthStore.getState().logout() // le garde réactif bascule sur /
    throw new ApiError(401, body?.error?.message ?? "Session expirée")
  }
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? `Erreur API (${res.status})`)
  }
  return (body?.data ?? body) as T
}
```

(`status` déclaré explicitement : `erasableSyntaxOnly` interdit les parameter properties.)

### T4 — API auth : `web/src/lib/auth-api.ts`

```ts
import { apiFetch } from "@/lib/api-client"
import type { Session } from "@/stores/auth-store"

interface AuthPayload {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: { id: number; name: string; email: string; roles: string[] }
}

// Mappe le snake_case GRAB vers une Session camelCase côté client.
export async function login(email: string, password: string): Promise<Session> {
  const data = await apiFetch<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  }
}

export async function logout(): Promise<void> {
  await apiFetch<unknown>("/auth/logout", { method: "POST" })
}
```

### T5 — Pages, garde, router, composition

**`web/src/pages/require-auth.tsx`** — garde réactif :
```tsx
import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "@/stores/auth-store"

export function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return accessToken ? <Outlet /> : <Navigate to="/" replace />
}
```

**`web/src/pages/login-page.tsx`** — câble le composant Login existant :
```tsx
import { useMutation } from "@tanstack/react-query"
import { Navigate, useNavigate } from "react-router"
import { Login } from "@/components/auth/login"
import { login as loginApi } from "@/lib/auth-api"
import { useAuthStore } from "@/stores/auth-store"

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const accessToken = useAuthStore((s) => s.accessToken)

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: (session, { remember }) => {
      setSession(session, remember)
      navigate("/dashboard", { replace: true })
    },
  })

  if (accessToken) return <Navigate to="/dashboard" replace />

  return (
    <Login
      onSubmit={({ email, password, remember }) =>
        loginMutation.mutateAsync({ email, password, remember })}
    />
  )
}
```
(`onSubmit` renvoie la promesse de `mutateAsync` → le composant Login gère déjà loading + message d'erreur via `toErrorMessage`.)

**`web/src/pages/dashboard-page.tsx`** — placeholder (kanban = suivi) :
- Bandeau `Connecté en tant que {user.email}` avec `data-testid="login-success"`
- Bouton « Se déconnecter » `data-testid="logout-button"` → `useMutation({ mutationFn: logoutApi, onSuccess: () => useAuthStore.getState().logout() })` — pas de `navigate` : le garde bascule seul
- Envelopper dans `RequireAuth` via le router (pas dans la page)

**`web/src/router.tsx`** :
```tsx
import { createBrowserRouter, redirect } from "react-router"
import { DashboardPage } from "@/pages/dashboard-page"
import { LoginPage } from "@/pages/login-page"
import { RequireAuth } from "@/pages/require-auth"

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  {
    element: <RequireAuth />,
    children: [{ path: "/dashboard", Component: DashboardPage }],
  },
  { path: "*", loader: () => redirect("/") },
])
```

**`web/src/App.tsx`** (remplace le rendu direct de `<Login />`) :
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"
import { router } from "@/router"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
```
`main.tsx` inchangé. `App.css` : supprimer si devenu inutile (vérifier imports résiduels).

### T6 — data-testid e2e sur le composant Login

`web/src/components/auth/login.tsx` — attributs uniquement, zéro logique :
- `EmailField` email : `data-testid="login-email"` ; `PasswordField` du login : `data-testid="login-password"`
- bouton submit login : `data-testid="login-submit"`
- `ErrorBanner` : `data-testid="login-error"` (le message de l'API 401 — via `ApiError.message` — y apparaît déjà grâce à `toErrorMessage`)
Contrat complet documenté dans web/e2e/auth/login.spec.ts.

### T7 — Smoke e2e à jour : `web/e2e/smoke.spec.ts`

Remplacer l'assertion template « Get Started » (obsolète, voir commentaire du fichier) par : `goto "/"` → `expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()`. **Ne pas** toucher `AUTH_UI_READY` (reste `false`).

### T8 — Tests unitaires (vitest, jsdom)

Nouveaux fichiers :
- `web/src/stores/auth-store.test.ts` : setSession/logout ; `remember=true` écrit dans localStorage (et purge sessionStorage) ; `remember=false` écrit dans sessionStorage ; logout vide les deux. Avant chaque test : `localStorage.clear()`, `sessionStorage.clear()`, `useAuthStore.setState({accessToken:null, refreshToken:null, user:null})`
- `web/src/lib/api-client.test.ts` : `global.fetch` mocké — 200 unwrap `data` ; 401 → appelle `logout()` + `ApiError` avec `body.error.message` ; header Bearer injecté quand token présent
- `web/src/pages/login-page.test.tsx` : login OK → `setSession` appelé + navigation `/dashboard` (wrapper `MemoryRouter` + `QueryClientProvider` avec `retry:false`) ; login KO (rejet « Compte désactivé ») → banner visible
- `web/src/pages/require-auth.test.tsx` : sans token → `Navigate` vers `/` ; avec token → enfant rendu (`useAuthStore.setState`)

Existants à vérifier/adapter :
- `web/src/App.test.tsx` : doit passer tel quel (jsdom URL `/` → LoginPage non authentifié → heading « Connexion »). Sinon : `window.history.replaceState` avant render
- `web/src/components/auth/login.test.tsx` : inchangé (seuls des attributs testid sont ajoutés)

### T9 — Validation

```bash
make web-lint          # oxlint
make web-test          # vitest run (unitaires)
make web-build         # tsc -b && vite build (typecheck)
make web-e2e           # compose : smoke à jour + specs auth toujours skipped
```
Manuel (avec `make up` + `make web-dev`) : `/` affiche le login ; login réel contre l'API (user seedé) → `/dashboard` avec bandeau ; reload → session conservée (remember) ; logout → retour sur `/` ; `/dashboard` direct non authentifié → redirect `/`.

## Risques & cas limites

- **Session fantôme cross-storage** : purger les 2 storages au login ET au logout (géré dans `clearAuthStorages`) — sinon un login `remember=false` laisse l'ancienne entrée localStorage
- **Réhydratation sessionStorage au boot** : le store démarre sur localStorage par défaut ; le bootstrap du module (T2) rebranch vers sessionStorage quand nécessaire — exécuté une fois au chargement du module store
- **401 pendant une mutation login elle-même** (mauvais identifiants) : NE PAS déclencher le logout global pour `/auth/login` — soit ne déclencher le logout auto que si un token était présent, soit exclure les routes `/auth/*`. Recommandation : `if (res.status === 401 && accessToken) logout()`
- **Persistance entre tests** : les nouveaux tests doivent resetter les storages ET `persist.setOptions` (le `setOptions` d'un test `remember=false` fuit vers le suivant — remettre `createJSONStorage(() => localStorage)` dans le `beforeEach`)
- **e2e compose** : les specs auth restent skippées (`AUTH_UI_READY=false`) — aucune dépendance API au e2e dans cette itération ; seul le smoke tourne

## Suivis (hors périmètre, ordre suggéré)

1. Interceptor rotation refresh (401 → `POST /auth/refresh` single-flight + retry)
2. Page register (composant à créer) + flip `AUTH_UI_READY=true` → specs e2e login/register/logout actives
3. Kanban réel sur `/dashboard` (data model produit)
4. Câblage `onCreateOrg` + RBAC UI (roles déjà dans le store)
