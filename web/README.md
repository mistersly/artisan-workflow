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

| Command          | Description                                            |
|------------------|--------------------------------------------------------|
| `make web-install` | `npm install` (in container if Docker is running)    |
| `make web-dev`     | dev server (logs in container / `npm run dev` host)  |
| `make web-build`   | type-check `tsc -b` + production build → `dist/`     |
| `make web-lint`    | lint with oxlint                                     |

## Scripts npm

```bash
npm run dev      # Vite dev server (HMR)
npm run build    # tsc -b && vite build → dist/
npm run lint     # oxlint
npm run preview  # serves the dist/ build
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
