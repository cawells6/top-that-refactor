# Top That! — Copilot Instructions

Canonical standards live in `docs/PROJECT_MANIFEST.md`. Process protocol lives in `docs/DEVELOPER_PROTOCOL.md`.
Roadmap/priorities live in `docs/ROADMAP_PROGRESS.md`. Follow them for all new/modified code.

## 🚨 NON-NEGOTIABLES (READ FIRST)

1.  **ALWAYS OPEN A NEW BRANCH.** Do not modify code on `main` or mix features.
    - Format: `feat/description` or `fix/description`.
2.  **TypeScript only.** Do not suggest switching to JS or disabling type checking.
3.  **Mobile-First.** Verify every UI change against a vertical mobile viewport.
4.  **No `any`.** Use `unknown` + narrowing if necessary.
5.  **Event names are constants.** Import from `src/shared/events.ts`.
6.  **Authoritative server.** Game rules + turn order live on the server; the client only renders `STATE_UPDATE` and emits requests.
7.  **Protocol vs game rules.**
    - Protocol violation (out-of-turn, invalid indices, acting during start/transition, client-forced outcomes): reject immediately (ERROR/ack fail).
    - Game rule violation (intended gameplay mistake): do not reject; trigger pickup-penalty mechanic.
8.  **Deterministic tests.** Any server randomness must be seedable/overrideable so Playwright runs are replayable (do not introduce flaky non-determinism).
9.  **Per-player state updates.** Preserve personalized `STATE_UPDATE` delivery (do not broadcast private state room-wide).

## 🛑 SCOPE & SAFETY RULES

1.  **File Integrity:** Do not "rebuild" files like `main.ts`, `game-board.css`, or `GameController.ts` from scratch. Edit them surgically.
2.  **Scope Control:** One prompt = One goal. If a task affects both *Game Logic* and *UI Layout*, stop and ask to split the task.
3.  **Iteration Limit:** If a fix fails **3 times**, stop. Do not try a 4th "guess." Ask the user to revert to the last working commit.
4.  **Visual Lock:** The visual theme (Green felt, Gold accents) is **FROZEN**.
    * **Protocol:** If asked to change this, **ASK FIRST**: *"This changes the established theme. Are you sure?"* If yes, proceed.
5.  **Timing/async changes require a contract.** Document event ordering assumptions, add idempotent "once" guards where needed, and use timeouts that fail fast with actionable logs.

## UI And CSS Discipline (Prevent Long Iterations)

When changing UI layout or styles, assume there are existing global rules and overrides.

1. **Search first:** Find all selectors that might affect the target element (id/class + shared classes like `.lobby-nav-button`, `.lobby-actions`).
2. **Cascade check:** Look for later rules in the same file that will override earlier ones (order + specificity).
3. **Reuse patterns:** If something should look like Join/Host, reuse the same classes and `data-tab` hooks instead of inventing new styles.
4. **Override deliberately:** If an override is necessary, prefer higher-specificity selectors placed after the generic rule; use `!important` only as a last resort.
5. **Verify both layouts:** Confirm desktop and mobile behavior (grid/flex placement + hover/active) in all relevant lobby panels.

## Build & Runtime (Know Before You Code)

1.  **`noEmit: true`** — `tsconfig.json` has `noEmit: true`. `tsc` only **type-checks**; it does not emit JS into `dist/`.
2.  **Server always runs from TS source** — via `tsx start-server.ts` (dev) or `node --loader ts-node/esm ./start-server.ts`. There is no compiled `dist/start-server.js`.
3.  **What `npm run build` does:** `tsc -p tsconfig.build.json` (type-check) + `vite build` (client bundle → `dist/client/`). The `postbuild` script fixes `.js` extensions in `dist/`.
4.  **`tsconfig.build.json` include list** — any new top-level folder with server TS must be added (e.g. `services/**/*.ts`). Forgetting this causes `TS6307` "not listed within the file list" errors on build.
5.  **ESM imports need `.js` extensions** — `moduleResolution: "NodeNext"` requires `.js` in relative imports (even for `.ts` source files). Missing extensions cause `TS2835`.
6.  **Dev entrypoints:** `./run` → `run.js` → `tsx start-server.ts`. Or `npm run dev:server` via nodemon.
7.  **Smoke test:** `npm run build:smoke` — type-checks, bundles client, starts server via tsx, curls `/health`.

## Test Pre-Flight (Run Before Writing Tests)

Before writing or modifying tests, always run the existing suite first to know what's already broken:

```bash
# Unit tests (expect 290+ pass; 3 known failures in socketService.test.ts)
npx jest --no-coverage

# Integration tests (requires babel-plugin-transform-import-meta for import.meta.url)
npm run test:integration

# Build check
npm run build
```

Do not assume prior tests pass. If they fail, check the base branch first (`git stash → run → git stash pop`) before investing time fixing.

## Diagnostics (Use Before Guessing)

- Client debug logs: `localStorage.TOPTHAT_DEBUG = '1'`
- Timing diagnostics: `localStorage.DEBUG_TIMING = '1'` then `window.timingDiag.getReport()`
- Server logs: `TOPTHAT_VERBOSE=1` or `TOPTHAT_SERVER_LOGS=1`
