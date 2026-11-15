# Rapport de drift — 2026-11-15

Cible : `.kilo/plans/1794741804673-vitest-playwright-frontend-testing-plan.md` (seul document du répertoire `.kilo/plans/`)

## 1794741804673-vitest-playwright-frontend-testing-plan.md

**Nature du document** : plan d'implémentation de travail futur (créé le 2026-11-15, jamais exécuté). Le drift est évalué sur deux plans : (1) prémisses factuelles — le plan décrit-il fidèlement le code actuel ? (2) implémentation — le code a-t-il divergé de ce que le plan propose ?

**Prémisses factuelles** : No drift detected. Toutes les affirmations vérifiables du plan contre l'état courant du code (routes auth et wiring rate-limit dans `internal/server/router.go`, codes de statut register 200 / 409 `Conflict` / login 401 dans `internal/user/handler.go`, DTOs dans `internal/user/dto.go`, wrapper de réponse dans `internal/errors/response.go`, bloc ratelimit `configs/config.yaml:46-49` non surchargé par `config.development.yaml`, absence d'infra de test dans `web/package.json`, alias/proxy/strictPort dans `web/vite.config.ts`, `references` dans les trois `web/tsconfig*.json`, pattern `web-lint` à `Makefile:257`, service `web` sans healthcheck dans `docker-compose.yml`, contenu de `web/src/App.tsx`) correspondent à la réalité. Aucune correction nécessaire au plan sur ce plan-là.

**Écarts d'implémentation (travail proposé non exécuté — divergence attendue, pas un défaut de conception)** :

- `web/package.json` : scripts `test`, `test:watch`, `test:coverage`, `e2e`, `e2e:report` absents ; devDependencies `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test` absentes
- `web/vitest.config.ts` : fichier absent
- `web/src/test/setup.ts` : fichier absent
- `web/src/App.test.tsx` : fichier absent
- `web/playwright.config.ts` : fichier absent
- `web/e2e/` : répertoire absent (`tsconfig.json`, `fixtures/auth.ts`, `smoke.spec.ts`, `auth/{register,login,logout}.spec.ts`)
- `docker-compose.yml` : pas de healthcheck sur le service `web`, pas de service `e2e` (profile `e2e`), pas de volume `e2e_node_modules` dans la section `volumes:`
- `Makefile` : cibles `web-test`, `web-test-coverage`, `web-e2e`, `web-e2e-report` absentes ; `.PHONY` (ligne 1) et bloc `help` (lignes 48-53) non mis à jour
- `web/README.md` : section « Tests » absente
- `web/.gitignore` : entrées `coverage`, `playwright-report`, `test-results` absentes

**Interprétation** : ces écarts sont l'état attendu d'un plan validé mais pas encore implémenté. Ils deviendraient du drift réel (dette d'implémentation) si le plan restait non exécuté après sa validation, ou si l'implémentation partielle s'écartait des étapes décrites. La prochaine exécution de ce rapport après implémentation devrait afficher « No drift detected » dans les deux catégories — sinon, l'implémentation aura divergé du plan.

**Recommandation du skill (coût de détection futur)** : le plan cite ses fichiers sources en texte brut (backticks) sans liens markdown relatifs. Les convertir en liens rendrait les futures exécutions de détection de drift moins coûteuses (résolution automatique des fichiers liés).
