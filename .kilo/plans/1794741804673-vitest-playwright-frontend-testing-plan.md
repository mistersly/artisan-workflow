# Plan — Vitest (tests unitaires composants) + Playwright (tests E2E parcours utilisateurs)

**Date** : 2026-11-15 (révisé après durcissement)
**Périmètre** : frontend `web/` (React 19 + Vite 8 + TS 7 + Tailwind 4) + Makefile + docker-compose.yml
**Hors périmètre** : workflow CI GitHub Actions, navigateurs Firefox/WebKit, seuils de coverage, création des pages d'auth (specs scaffolding), tests du composant `kanban.tsx`

---

## Contexte

- Le frontend `web/` n'a **aucune infra de test** aujourd'hui (aucun `*.test.*`, aucun runner).
- `App.tsx` est encore le template Vite de démarrage (bouton compteur). Le composant `src/components/reui/kanban.tsx` (dnd-kit) est le seul composant métier.
- Les parcours utilisateurs existent côté API Go (`internal/server/router.go:82-98` : register, login, refresh, logout, `/me`, users CRUD) mais **aucune page UI d'auth n'existe encore**.
- Dev Docker-first : conteneur web `node:24-alpine` (musl), Makefile auto-détecte Docker (`WEB_CONTAINER_RUNNING`), proxy Vite `/api` et `/health` vers l'API Go (8180).
- **Rate limiting actif en dev** (hérité de `configs/config.yaml:46-49` : 100 req / 1 min par IP, pas d'override dans `config.development.yaml`).

## Décisions actées avec l'utilisateur

| Décision | Choix |
|---|---|
| Portée E2E | Harnais Playwright + test smoke actif + **specs des parcours auth scaffolding (skipped)** jusqu'à ce que les pages existent |
| Exécution | **Tout en Docker** : Vitest dans le conteneur web existant ; Playwright via service compose dédié (image officielle `mcr.microsoft.com/playwright`, Debian/glibc) |
| CI | Local seulement, pas de workflow (mais config sans couplage à Docker local → CI-ready) |

## Choix techniques (arbitrés)

- **DOM** : `jsdom` (standard avec @testing-library/react), pas happy-dom.
- **Unit tests** : Vitest + `@testing-library/react` v16 (compat React 19 ; `@testing-library/dom` est un peer dep, auto-installé par npm ≥7) + `@testing-library/jest-dom` + `@testing-library/user-event`, `globals: true`.
- **Config Vitest** : `web/vitest.config.ts` séparé via `mergeConfig` depuis `vite.config.ts` (réutilise l'alias `@/` et les plugins React).
- **Coverage** : `@vitest/coverage-v8`, aucun seuil initialement (GRAB exige 85 % côté Go ; le frontend part de zéro).
- **Playwright** : Chromium uniquement, reporter `list` + `html` (`open: never` — indispensable en conteneur), `trace: 'retain-on-failure'` (cohérent avec `retries: 0` — `on-first-retry` ne produirait jamais de trace), `baseURL` via `E2E_BASE_URL` (défaut compose : `http://web:5173` — le proxy Vite route vers l'API).
- **E2E vs tsc -b** : specs dans `web/e2e/` avec tsconfig standalone **non référencé** par le root `tsconfig.json` → `tsc -b` (donc `npm run build`) ne les type-checke pas ; Playwright les transpile lui-même.
- **Épinglage** : `@playwright/test` en version **exacte** (`--save-exact`, pas de `^`) et tag d'image Docker identique — sinon erreur « Executable doesn't exist ». Le registre npm/MCR n'est pas interrogeable depuis l'environnement de planification : l'épinglage se fait **au moment de l'install** (lire la version installée, cf. étape 4).

## Contrat API auth (base des fixtures — vérifié dans le code)

- Wrapper universel (`internal/errors/response.go:6-22`) : succès `{ "success": true, "data": ... }` ; erreur `{ "success": false, "error": { "code", "message", "timestamp", ... } }`.
- `POST /api/v1/auth/register` `{ name (2-100), email, password (min 6) }` → **200** (pas 201) + `AuthResponse { access_token, refresh_token, token_type, expires_in, user { id, name, email, roles, ... } }` ; email existant → 409 (`internal/user/handler.go:51`).
- `POST /api/v1/auth/login` `{ email, password }` → 200 + `AuthResponse` ; identifiants invalides → **401** (`internal/user/handler.go:95`).
- `GET /api/v1/auth/me` (Bearer access_token) → 200 + `UserResponse`.
- `POST /api/v1/auth/logout` (Bearer) → 200 + `{ "data": { "message": "Successfully logged out" } }`.
- Password fixture valide : min 6 caractères, ex. `Passw0rd!e2e`.

---

## Étapes d'implémentation

### Étape 1 — Dépendances Vitest (dans `web/`)

```bash
cd web && npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- Vérifier l'absence de conflit peer deps Vitest ↔ Vite 8 (si conflit, prendre la dernière mineure Vitest dont le range supporte Vite 8).

Scripts npm ajoutés dans `web/package.json` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Étape 2 — Config Vitest + TS + gitignore

1. Créer `web/vitest.config.ts` :

```ts
import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      coverage: { provider: "v8", reporter: ["text", "html"] },
    },
  }),
)
```

2. `web/tsconfig.node.json` : `"include": ["vite.config.ts", "vitest.config.ts"]`.
3. `web/tsconfig.app.json` : `"types": ["vite/client", "node", "vitest/globals"]` (les tests unitaires sont colocalisés dans `src/` et type-checkés par `tsc -b`).
4. Créer `web/src/test/setup.ts` : `import "@testing-library/jest-dom/vitest"` (l'augmentation de types jest-dom devient visible car le fichier est dans `src`).
5. `web/.gitignore` : ajouter `coverage`, `playwright-report`, `test-results`.

### Étape 3 — Premier test unitaire (validation du harnais)

Créer `web/src/App.test.tsx` (rendu du bouton compteur de `App.tsx`) :
- `render(<App />)` → `getByRole("button", { name: /count is/i })` affiche « Count is 0 »
- `userEvent.click` → affiche « Count is 1 »

Valider : `cd web && npx vitest run` → 1 test vert.

### Étape 4 — Playwright : deps + config + specs

1. Installer (version exacte, lire la version installée pour l'étape 5) :

```bash
cd web && npm install -D --save-exact @playwright/test
node -e "console.log(require('@playwright/test/package.json').version)"
```

2. Créer `web/playwright.config.ts` :

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
```

3. Créer l'arborescence E2E :

```
web/e2e/
├── tsconfig.json          # standalone (pas référencé par web/tsconfig.json)
├── fixtures/auth.ts
├── smoke.spec.ts
└── auth/
    ├── register.spec.ts
    ├── login.spec.ts
    └── logout.spec.ts
```

- `web/e2e/tsconfig.json` : config minimale (`module: "preserve"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `types: ["node"]`, `lib` DOM) — pour l'éditeur uniquement, hors du build `tsc -b`.
- `web/e2e/fixtures/auth.ts` :
  - `export const AUTH_UI_READY = false` — source unique du skip ; les specs l'importent.
  - Fixture `test.extend` `authApi` : helpers API via `playwright.request.newContext({ baseURL })` qui frappent `/api/v1/auth/...` **à travers le proxy du front** (parcours full-stack), en respectant le contrat API ci-dessus :
    - `register(name, email, password)` → attend **200**, retourne `data.access_token`, `data.refresh_token`, `data.user` ; 409 = email déjà pris
    - `login(email, password)` → 200 + tokens ; 401 = identifiants invalides
    - `me(accessToken)` → Bearer `GET /me`, 200 + `data`
    - `logout(accessToken)` → Bearer `POST /logout`
  - Emails uniques par run (`e2e-${Date.now()}-${crypto.randomUUID()}@e2e.test`, TLD `.test` réservé RFC 2606) pour ne pas polluer la DB de dev.
- `web/e2e/smoke.spec.ts` (**actif dès maintenant**) : la page d'accueil charge, `h1` « Get started » visible. ⚠️ Ce sélecteur est du contenu du template de départ : le smoke devra évoluer quand `App.tsx` sera reworké (asserter un repère stable de la vraie app).
- `web/e2e/auth/{register,login,logout}.spec.ts` : scénarios complets **gardés sous** `test.skip(!AUTH_UI_READY, "Pages d'auth non implémentées")` :
  - register : remplir le formulaire → soumission → user connecté visible
  - login : succès + échec (message d'erreur mot de passe invalide — l'API renvoie 401, `{ success: false, error: { message } }`)
  - logout : login → logout → accès ressource protégée redirigé
  - Sélecteurs placeholder sur convention `data-testid` (ex. `register-email`, `register-password`, `register-submit`, `login-email`, `login-submit`), documentée en commentaire comme contrat à respecter lors du dev des pages.
  - Pas de `storageState` pour l'instant ; prévoir de brancher les fixtures `authApi` pour seeder l'état authentifié quand les pages existeront.

4. Scripts npm : `"e2e": "playwright test"`, `"e2e:report": "playwright show-report"`.

### Étape 5 — Docker : healthcheck web + service e2e (docker-compose.yml)

1. Ajouter un **healthcheck au service `web`** (node:24-alpine n'a pas curl ; node 24 a fetch) — rend le démarrage E2E déterministe et améliore l'observabilité de la stack :

```yaml
  web:
    # ... existing config ...
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:5173').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 120s   # couvre le npm install du premier boot (volume vide)
```

Impact : nul pour `make up` (pas de `--wait`), seul e2e attend la condition `service_healthy`.

2. Ajouter le service e2e (avec le **tag d'image identique à la version `@playwright/test`** relevée à l'étape 4 ; si le tag `-noble` n'existe pas pour cette version, vérifier les tags MCR et prendre `-jammy`) :

```yaml
  e2e:
    image: mcr.microsoft.com/playwright:vX.Y.Z-noble   # = version @playwright/test dans web/package.json (épinglée)
    container_name: ${E2E_CONTAINER_NAME:-go_api_e2e}
    profiles: ["e2e"]
    working_dir: /app
    environment:
      - E2E_BASE_URL=http://web:5173
    volumes:
      - ./web:/app
      - e2e_node_modules:/app/node_modules   # glibc ≠ musl : volume DÉDIÉ, ne JAMAIS réutiliser web_node_modules
    command: sh -c "npm install --no-audit --no-fund && npx playwright test"
    depends_on:
      web:
        condition: service_healthy   # le smoke ne démarre pas avant que Vite serve
    networks:
      - go_api_network
```

3. Ajouter le volume `e2e_node_modules` à la section `volumes:` existante.

Notes : le profile `e2e` évite de tirer l'image (~2 Go) lors d'un `make up` ; `docker compose run --rm e2e` cible le service sans activer le profile et démarre automatiquement les dépendances (web → app → db) ; navigateurs préinstallés dans l'image → pas de `playwright install`.

### Étape 6 — Cibles Makefile

1. `.PHONY` : ajouter `web-test web-test-coverage web-e2e web-e2e-report`.
2. `web-test` et `web-test-coverage` : copier le pattern `web-lint` (Makefile:257) — `docker exec $(WEB_CONTAINER_NAME) npm run test` si conteneur actif, sinon fallback `cd web && npm run test` (coverage : `test:coverage`).
3. `web-e2e` : toujours en Docker — `docker compose run --rm e2e`. Faire précéder d'un echo « premier run : pull ~2 Go + remplissage du volume e2e_node_modules (~1-2 min) ».
4. `web-e2e-report` : `docker compose run --rm -p 9323:9323 e2e sh -c "npm install --no-audit --no-fund && npx playwright show-report --host 0.0.0.0 --port 9323"` (ouvrir http://localhost:9323 côté hôte ; le rapport est aussi lisible en direct dans `web/playwright-report/` monté).
5. Mettre à jour le bloc `help` (Makefile:48-53) avec les 4 nouvelles cibles.
6. Pas de cible make pour le watch mode : en conteneur il est inutilisable sans TTY/polling (`CHOKIDAR_USEPOLLING` ne s'applique qu'à Vite). À documenter : `cd web && npm run test:watch` côté hôte WSL.

### Étape 7 — Documentation

Mettre à jour `web/README.md` : nouvelle section « Tests » (cibles make, scripts npm, structure `e2e/`, mécanisme `AUTH_UI_READY` — passer à `true` et implémenter les sélecteurs `data-testid` quand les pages d'auth seront développées, épinglage image ↔ package, watch mode côté hôte).

---

## Validation (à exécuter dans l'ordre)

1. **Resync des volumes** : les nouvelles devDeps doivent entrer dans le volume `web_node_modules` du conteneur → `make down && make up` (ou `make web-install` après `make up`).
2. `make web-test` → test App vert (dans le conteneur si stack up, sinon hôte).
3. `make web-test-coverage` → rapport coverage généré sans erreur.
4. `make web-lint` → oxlint propre (si bruit sur `e2e/`, ajouter le dossier aux `ignorePatterns` de `web/.oxlintrc.json`).
5. `make web-build` → `tsc -b` passe (vitest.config.ts type-checké ; App.test.tsx type-checké ; e2e/ exclu du build).
6. `make web-e2e` → compose attend `web` healthy, puis smoke vert + 3 specs auth signalées skipped.
7. `make web-e2e-report` → rapport HTML accessible sur http://localhost:9323.
8. Vérifier `git status` : `web/package-lock.json` ne doit pas contenir de réécriture intempestive issue du run e2e (cf. risques).

## Risques et points d'attention

- **Drift image ↔ package** : tag `mcr.microsoft.com/playwright` strictement égal à la version `@playwright/test` (épinglée sans `^`). Symptôme de drift : « Executable doesn't exist ».
- **musl vs glibc** : les volumes `web_node_modules` (alpine) et `e2e_node_modules` (Debian) doivent rester distincts — un node_modules partagé casse esbuild/rollup.
- **Réécriture du lockfile par le conteneur e2e** : `npm install` tourne dans l'image Playwright (version npm ≠ hôte) sur le montage `./web` en lecture-écriture → réécriture possible de `package-lock.json`. Si `git status` montre un diff après un run e2e, le réinitialiser (`git checkout web/package-lock.json`) et re-synchroniser ; le lockfileVersion 3 est stable entre npm 10/11, risque faible.
- **Volume obsolète** : après tout ajout de devDep côté hôte, resync le conteneur (`make down && make up`).
- **Rate limiting API (actif en dev)** : 100 req / 1 min, bucketé par IP (`internal/server/router.go:58-78`). Tout le trafic e2e passe par le proxy Vite sans `X-Forwarded-For` → **une seule bucket partagée** (l'IP du conteneur web). Le socle actuel (smoke + 3 specs) consomme quelques requêtes : sans impact. Si les futures suites parallèles + polling applicatif approchent 100/min : surcharger `RATELIMIT_REQUESTS`/`RATELIMIT_ENABLED` pour le run e2e ou réduire `workers`.
- **Données de dev** : les parcours register créeront de vrais users en DB de dev — helpers à emails uniques obligatoires (prévu dans `fixtures/auth.ts`).
- **Vitest ↔ Vite 8** : vérifier le peer range à l'install ; en cas de conflit, fixer la dernière mineure Vitest supportée.
- **Smoke couplé au template** : l'assertion « Get started » sautera dès qu'`App.tsx` sera reworké — c'est voulu pour valider le harnais maintenant, à remplacer par un repère stable de la vraie app.

## Déploiement CI ultérieur

L'architecture reste déployable en CI sans refonte : les cibles make ne sont que des wrappers, le substrat est des scripts npm purs (`test`, `test:coverage`, `e2e`), `E2E_BASE_URL` est paramétrable, le reporter HTML écrit sur disque sans ouverture auto. Deux modes possibles le moment venu :

- **Mode réplique compose** (uniforme avec le local, plus lourd) : la CI fait `docker compose up` + `docker compose run e2e`. Prérequis : runner avec Docker (standard sur GitHub Actions ubuntu), cache des images (Playwright ~2 Go), migrations appliquées, `.env`/`JWT_SECRET` fournis. Conserve la discipline d'épinglage image ↔ package.
- **Mode natif** (léger, standard Playwright) : `npm ci` + `npx playwright install --with-deps chromium` + services Go/Postgres + bloc `webServer` **additif** dans `playwright.config.ts` (command `npm run dev`, `url`, `reuseExistingServer: !process.env.CI`). Supprime le risque de drift image ↔ package. Ce bloc n'est volontairement pas posé maintenant (compose fournit déjà le serveur localement) — c'est le seul ajout de config nécessaire pour ce mode.

Frictions connues à anticiper en CI :

- **Rate limiting** : bucket IP unique du runner + workers parallèles → override `RATELIMIT_ENABLED=false` ou montée de `RATELIMIT_REQUESTS` pour le job e2e.
- **Valeur E2E actuelle** : sans pages d'auth, la suite E2E en CI ne rapporte que la validation du harnais (smoke sur contenu de template) — le ROI arrive avec `AUTH_UI_READY = true`.
- **Artefacts de job** : uploader `playwright-report/` et `coverage/` (gitignorés localement).

## Futurs chantiers (hors scope, notés pour la suite)

- Firefox/WebKit dans `projects` Playwright.
- Seuils de coverage une fois le socle de tests suffisant.
- Activer les specs auth : créer les pages + flip `AUTH_UI_READY = true`.
- Tests unitaires du composant `kanban.tsx` (dnd-kit — nécessitera des helpers de simulation de drag et probablement un polyfill `ResizeObserver` sous jsdom).
