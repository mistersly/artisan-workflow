# Implementation Readiness Report

- **Target**: `.kilo/plans/1794784048498-web-router-zustand-query.md` (330 lines)
- **Mode**: Implementation plan only (EGM review, Preset 3 → Stage 9)
- **Range**: full file, lines 1–330
- **Round**: 1 — direct dispatch, 3 fresh-context Goldfish reviewers (parallel)
- **Standards**: `implementation-readiness-standard` (egm-implementation-readiness, egm-codebase-details); egm-style ran on its persona mandate (no standard)
- **Baseline context (GoldfishContext)**: web/package.json, web/vite.config.ts, web/vitest.config.ts, web/tsconfig.app.json, web/.oxlintrc.json, web/src/App.tsx, web/src/main.tsx, web/src/App.test.tsx, web/src/components/auth/login.tsx, web/src/components/auth/login.test.tsx, web/e2e/fixtures/auth.ts, web/e2e/smoke.spec.ts, web/e2e/auth/login.spec.ts, web/e2e/auth/logout.spec.ts, internal/server/router.go, internal/user/dto.go, Makefile

## Reviewer status

| Reviewer | Status |
|---|---|
| egm-implementation-readiness | completed |
| egm-codebase-details | completed |
| egm-style | completed |

## Severity summary

🔴 Blockers: 0 · 🟡 Major: 5 · 🟢 Nit: 27 (1 codebase + 26 style)

## Findings

### 🟡 Major

**ir1-1 — egm-implementation-readiness — lines 147–149 (T3, `apiFetch` 401 handling)**
The snippet calls `useAuthStore.getState().logout()` unconditionally on any 401, including a failed login attempt where no token is present. This contradicts the plan's own risk rule at line 321 (`if (res.status === 401 && accessToken) logout()`).
Rationale: as written, a failed login would clear an existing session and the reactive guard would bounce the user to `/` — a bug the implementer must debug, contradicting the plan's stated mitigation.
Suggested fix (reviewer): inside the 401 branch, only call `logout()` when the store currently holds an access token.

**ir1-2 — egm-implementation-readiness — lines 218–225 & 231–234 (T5, LoginPage mutation typing)**
`mutationFn` is typed `({ email, password }: { email: string; password: string })`, but `mutateAsync` is called with `{ email, password, remember }` (excess property error on the object literal) and `onSuccess` destructures `{ remember }` from the mutation variables (property does not exist on the inferred `TVariables`). The snippet does not compile.
Rationale: blocking TypeScript error; the plan is not executable as written.
Suggested fix (reviewer): type the mutation variables as `{ email: string; password: string; remember: boolean }`.

**ir1-3 — egm-implementation-readiness — lines 239–242 (T5, DashboardPage)**
The page is specified in prose only (banner + logout button). No snippet: JSX structure, imports, selector usage, and mutation wiring are left as implementer decisions.
Rationale: violates the zero-decision rule for a file the plan creates; risks incorrect `data-testid` usage.
Suggested fix (reviewer): provide a complete `web/src/pages/dashboard-page.tsx` snippet.
*Consolidation note*: the reviewer's suggested snippet is defective — `const { user } = useAuthStore((s) => s.user ?? { email: "" })` destructures `user` from a selector that returns a user object (yields `undefined`). Do not apply verbatim; use a direct selector such as `const user = useAuthStore((s) => s.user)`.

**ir1-4 — egm-implementation-readiness — line 281 (T5, App.css)**
« supprimer si devenu inutile (vérifier imports résiduels) » leaves "what is unused" as an implementer judgment call.
Rationale: ambiguity → risk of dead CSS or wrongly removed styles.
Suggested fix (reviewer): make it deterministic — the new `App.tsx` renders only providers, so delete `web/src/App.css` entirely and remove its import if present.

**ir1-5 — egm-implementation-readiness — lines 297–305 (T8, unit tests)**
Test intents are listed (storage splits, 401 handling, login navigation, guard redirects) but no test code is provided; the implementer must invent fetch mocking, storage/`persist.setOptions` resets, and router/query test wrappers.
Rationale: violates actionability; test boilerplate choices should not be improvised.
Suggested fix (reviewer): provide concrete test snippets per file.
*Consolidation note*: the reviewer's example contains an invalid import (`import { setSession } from "zustand"`); rewrite during resolution.

### 🟢 Nit

**cd1-1 — egm-codebase-details — line 12 (Périmètre, API client)**
"`{success, data, error}`" compresses the GRAB envelope: success responses are `{success: true, data}`, errors are `{success: false, error: {message}}` — line 26 states it correctly. Suggested: align line 12 with the line-26 wording.
Reviewer also confirms: all other codebase claims verified accurate against source files (endpoints, HTTP verbs, JSON casing, `erasableSyntaxOnly`/`verbatimModuleSyntax`, vitest globals + jsdom setup, oxlint ignores, Makefile targets, package scripts, Login prop contract incl. `remember`, e2e data-testid contract).

**st1-1 … st1-26 — egm-style — persona style audit** (all 🟢 Nit)

| id | lines | issue | suggested fix (reviewer) |
|---|---|---|---|
| st1-1 | 4 | « en branchant un flux d'auth réel » vague | « en mettant en place un flux d'authentification (…) tout en préservant l'existant : » |
| st1-2 | 9 | parenthetical npm explanation noisy | « via npm (comme indiqué dans web/package-lock.json) » |
| st1-3 | 14 | « posés » unusual | « ajoutés » |
| st1-4 | 18 | « placeholder pour l'instant » filler | remove the phrase |
| st1-5 | 24 | « (vérifiés) » redundant | drop from heading |
| st1-6 | 28 | « déjà configuré » / « rien à faire » filler | « (voir web/vite.config.ts:20) » |
| st1-7 | 30 | wordy e2e sentence | « les specs d'auth sont ignorées tant que AUTH_UI_READY=false (ne pas flipper) ; le smoke e2e référence un heading template à mettre à jour » |
| st1-8 | 39 | « conservé » filler | drop |
| st1-9 | 40 | « convention existante » filler | drop |
| st1-10 | 100–102 | bootstrap comment wordy | « // Bootstrap (au chargement du module) : réhydrater depuis sessionStorage si localStorage vide » |
| st1-11 | 115 | « Ordre important » filler | « Note : » |
| st1-12 | 116 | partialize note verbose | shorten |
| st1-13 | 227 | mixed-language comment awkward | « (le composant Login gère déjà le loading et le message d'erreur via toErrorMessage) » |
| st1-14 | 241–242 | « pas de navigate : le garde bascule seul » filler | drop the clause |
| st1-15 | 281–282 | « inchangé » + parenthetical filler | split into two plain sentences |
| st1-16 | 285 | « zéro logique » informal | « uniquement des attributs, aucune logique » |
| st1-17 | 293 | « **Ne pas** » emphasis informal | « Ne pas modifier AUTH_UI_READY (reste false). » |
| st1-18 | 304 | « doit passer tel quel » filler | « devrait passer tel quel » |
| st1-19 | 305 | « inchangé » filler | « seuls les attributs testid sont ajoutés (inchangé autrement) » |
| st1-20 | 315 | « Manuel » label filler | drop |
| st1-21 | 318 | « Session fantôme » metaphor | « Session croisée entre storages » |
| st1-22 | 319 | redundant phrase « module store » | « exécuté une fois au chargement du module » |
| st1-23 | 320 | caps + « Recommandation : » informal | neutral wording, keep the conditional-logout rule |
| st1-24 | 321 | « fuit vers le suivant » informal | « influe sur le test suivant » |
| st1-25 | 322 | « seul le smoke tourne » informal | « seul le test smoke est exécuté » |
| st1-26 | 326 | « (hors périmètre, ordre suggéré) » redundant | « ## Suivis » |

## Consolidation notes (for the resolution phase)

1. **ir1-1 and ir1-2 are genuine snippet defects**; the fixes are mechanical (conditional logout; widen mutation variables type) and align with rules the plan itself already states (line 321).
2. **ir1-3, ir1-4, ir1-5 require authoring new plan content** (dashboard snippet, deterministic App.css rule, test snippets). The reviewers' own example code contains defects (see notes above) — rewrite, do not copy verbatim.
3. **cd1-1 is a one-line precision fix** — low risk.
4. **Style findings (st1-*) should not be blanket-applied.** Several suggestions remove scope-bearing information (st1-4 « placeholder pour l'instant » marks an intentional scope boundary; st1-5 « (vérifiés) » records audit provenance; st1-9 « convention existante » justifies the naming decision; st1-26 « (hors périmètre, ordre suggéré) » carries scope + ordering). st1-7 mischaracterizes the original sentence as a typo. Recommend applying only the clarity/consistency subset during resolution and contesting the information-removing ones.
