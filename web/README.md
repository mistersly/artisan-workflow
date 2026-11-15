# Artisan Workflow — Frontend

Frontend of the [GRAB](https://github.com/vahiiiid/go-rest-api-boilerplate) based project: React 19 + TypeScript + Tailwind CSS 4 (Vite).

## Quick start

```bash
# Docker (recommended): web service bundled in `make up`
make up              # starts db + api + web
# web available on http://localhost:5173

# Or run natively on the host
cd web
npm install
npm run dev          # http://localhost:5173
```

## Make targets

From the repository root (docker-aware, like the Go commands):

| Command                | Description                                            |
|------------------------|--------------------------------------------------------|
| `make web-install`     | `npm install` (in container if Docker is running)      |
| `make web-dev`         | dev server (logs in container / `npm run dev` host)    |
| `make web-build`       | type-check `tsc -b` + production build → `dist/`       |
| `make web-lint`        | lint with oxlint                                       |
| `make web-test`        | unit tests (Vitest, container-aware)                   |
| `make web-test-coverage` | unit tests + coverage report → `web/coverage/`       |
| `make web-e2e`         | Playwright E2E in the dedicated e2e container          |
| `make web-e2e-report`  | serve the E2E HTML report (http://localhost:9323)      |

## Scripts npm

```bash
npm run dev      # Vite dev server (HMR)
npm run build    # tsc -b && vite build → dist/
npm run lint     # oxlint
npm run preview  # serves the dist/ build
npm run test     # unit tests (Vitest)
npm run test:coverage  # unit tests + coverage
npm run e2e      # Playwright E2E (expects a reachable web server)
```

## API proxy

The dev server proxies `/api` and `/health` to the Go API to avoid any CORS issue:

- **Host**: target `http://localhost:8180` (default).
- **Container** (compose): `API_PROXY_TARGET=http://app:${SERVER_PORT:-8180}` — the injected env variable points to the API service.

Swagger is not proxied: access it directly at http://localhost:8180/swagger/index.html.

`SERVER_PORT` is interpolated by compose: if the API port changes again, the proxy follows automatically.

## Ports

| Context         | URL                            |
|-----------------|--------------------------------|
| Dev (host)      | http://localhost:5173          |
| Dev (container) | port `5173` → host `${WEB_DEV_PORT:-5173}` |
| Prod (nginx)    | host `${WEB_PORT:-3000}` → container `80`  |

## Tests

### Unit tests (Vitest + Testing-library, jsdom)

Component tests live next to the code (`src/**/*.test.tsx`), harness validated in `src/App.test.tsx`.

```bash
make web-test              # vitest run (in container if it is running)
make web-test-coverage     # coverage report (v8) → web/coverage/
# Watch mode is only usable on the host (WSL):
cd web && npm run test:watch
```

Config: `vitest.config.ts` (merges `vite.config.ts` — reuses the `@/` alias); setup in `src/test/setup.ts` loads `@testing-library/jest-dom/vitest`.

### E2E (Playwright, Chromium only)

Runs in a dedicated `e2e` compose service (Debian/glibc image, browsers preinstalled — no `playwright install`), separate `e2e_node_modules` volume (glibc ≠ musl of `web_node_modules`):

```bash
make web-e2e               # docker compose run --rm e2e (waits for web to be healthy)
make web-e2e-report        # HTML report on http://localhost:9323
```

The `e2e` service has the compose profile `e2e`: it never starts with `make up`. API calls go through the frontend proxy (`/api` → Go API), so tests exercise the full stack. Note: the dev rate limit (100 req/min per IP, one shared bucket through the proxy) is unaffected by the current suite size.

Structure:

```
web/e2e/
├── tsconfig.json        # standalone, not part of tsc -b (spec type-check is Playwright's job)
├── fixtures/auth.ts     # AUTH_UI_READY flag + authApi fixture (register/login/me/logout via API)
├── smoke.spec.ts        # active: validates the harness (asserts template content — evolve with App.tsx)
└── auth/                # register / login / logout journeys
```

**Auth specs are skipped on purpose**: `AUTH_UI_READY = false` in `e2e/fixtures/auth.ts`. When the auth pages are developed, flip it to `true` and implement the `data-testid` contract documented in each spec (`register-*`, `login-*`, `logout-button`, protected route) — the fixtures then seed the test users (unique `@e2e.test` emails) through the API.

**Version pinning**: the `@playwright/test` version in `package.json` (exact, no `^`) must strictly equal the tag of `mcr.microsoft.com/playwright` in `docker-compose.yml`. Drift symptom: « Executable doesn't exist ».

## HMR in container

If HMR does not trigger under Docker (inotify not working on some mounts), add to `.env`:

```bash
CHOKIDAR_USEPOLLING=1
```

## Production

The multi-stage Dockerfile (`node:24-alpine` build + `nginx:alpine`) builds the SPA and reverse-proxies `/api`, `/health` and `/swagger` to the API. See `docker-compose.prod.yml` (service `web`).

> **Note:** when the dev stack is running, start the prod stack with a distinct compose project name, otherwise compose considers dev services part of the prod project (same directory) and recreates them:
>
> ```bash
> WEB_PORT=3001 docker compose -p aw-prod -f docker-compose.prod.yml up -d --wait
> ```
