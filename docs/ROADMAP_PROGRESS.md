
# 🏁 Top That! Refactor Roadmap Tracker

**Current Phase:** Phases 1-4 complete. Phase 5+ roadmap below.
**Last Audit:** 2025-07-24 (comprehensive full-codebase audit)
**Source:** `0127 Get Well.xlsx - Sheet3.csv`

## 🔍 Phase 1: Server Hardening & Validation
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **1** | **Repo hygiene cleanup** | ✅ **Done** | Dead files removed, `.gitignore` present. |
| **2** | **Typed event payload contracts** | ✅ **Done** | `src/shared/types.ts` defines payloads. Client socket generically typed as `Socket<ServerToClientEvents, ClientToServerEvents>`. |
| **3** | **Server-side Protocol Validation** | ✅ **Done** | `GameController.validateRequest` & `isValidPlay` prevent illegal moves. |
| **4** | **Reject duplicate cardIndices** | ✅ **Done** | `GameController.ts` explicitly checks `Set(cardIndices).size` to block dupes. |
| **5** | **Shared JOIN validation rules** | ✅ **Done**  | `src/shared/validation.ts` exports `validateJoinPayload()`. `GameController.ts` imports & uses it. Host-specific policy (numHumans/numCPUs ranges) remains inline in the controller — acceptable. |
| **6** | **Lock down transitions** | ✅ **Done** | `isStarting` flag implemented in `GameState` and guards `GameController` actions. |

## 🏗️ Phase 2: Lifecycle & Persistence
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **7** | **Centralize public state projection** | ✅ **Done** | `GameController.broadcastState` calls `GameState.getPublicView(targetPlayerId)` per player. All card masking (hand privacy, down-card hiding, leak scrubbing) lives in `getPublicView`. |
| **8** | **Persistent playerId for rejoin** | ✅ **Done** | Session persisted to `localStorage` with `TOPTHAT_SESSION` key and 1-hour TTL. `GameController` handles `REJOIN` event. |
| **9** | **Graceful shutdown on mass disconnect** | ✅ **Done** | `GameController.handleDisconnect` now starts a 30s timer when the last human leaves. `handleRejoin` cancels it. |
| **10** | **Room lifecycle destroy hook** | ✅ **Done** | `destroy()` cleans up timers, calls `socket.removeAllListeners()`, and clears `socketIdToPlayerId`. |
| **11** | **Extract bot logic to BotService** | ✅ **Done** | Bot logic extracted to `services/bot/DefaultBotStrategy.ts`, decoupling it from `GameController`. |

## 🛠️ Phase 3: Standardization & UX
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **12** | **Dedupe isValidPlay** | ✅ **Done** | Logic centralized in `utils/cardUtils.ts`. Client-side (`public/scripts/render.ts`) now correctly imports and re-exports this function, ensuring both Client and Server use the same code. |
| **13** | **Centralize timing constants** | ✅ **Done** | All gameplay timing centralized in `src/shared/constants.ts`, including `STARTUP_LOCK_FALLBACK_MS` and `POST_REJOIN_BOT_DELAY_MS`. |
| **14** | **Show server error text in-game** | ✅ **Done** | `socketService.ts` listens for `ERROR` event and displays toast/visual feedback. |
| **15** | **Explicit burn feedback** | ✅ **Done** | `SpecialCardEffectPayload` enriched with `playerId`, `playerName`, `burnedCount`. `PilePickedUpPayload` enriched with `reason` (`'voluntary'` \| `'invalid-play'`) and `invalidCard`. Server populates all fields in `handleSpecialCard()` and both `PILE_PICKED_UP` emit sites. Client `logSpecialEffect()` and `logPileTaken()` display player name, card count, and invalid-play details in game log. Existing tests strengthened with new field assertions. Build clean, 290 unit tests pass, 9/9 integration tests pass. |
| **16** | **Network Bandwidth (Quick Win)** | ✅ **Done** | `getPublicView` now projects pile as `PileSummary { topCard, belowTopCard, count }` instead of full `Card[]` array. Wire payload reduced to 3 fields per update. Client files updated: `render.ts`, `socketService.ts`, `gameControls.ts`, `dealing-animation.ts`, `animationQueue.ts`. Tutorial builds summary from local `Card[]`. All 290 unit tests pass, 9/9 integration tests pass, build clean. |
| **17** | **Break up client god files** | ✅ **Done** | Opening deal logic extracted to `OpeningDealCoordinator`. Render calls intentionally kept in socketService as part of animation sequences. |

## 🧪 Phase 4: Testing & Deployment
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **18** | **Room cleanup with stale-started timeout** | ✅ **Done** | `GameRoomManager` cleanup interval has two-tier logic: empty/unstarted rooms cleaned after `EMPTY_TIMEOUT_MS`; stale started games cleaned after `STALE_TIMEOUT_MS` (30 min). Both imported from `src/shared/constants.ts`. |
| **19** | **GameController unit tests** | ✅ **Done** | 28 edge-case tests added in `tests/gameController.edgeCases.test.ts` covering: destroy() cleanup, disconnect (pre-game host reassignment, mid-game shutdown timer, active-player turn advance), turn transition lock, duplicate indices, play-card validation, pickup-pile rejections, broadcastState per-player privacy, isStarting blocks, up-card plays, validateRequest, clearAllTimeouts, handleStartGame guards, rejoin edge cases, hasConnectedClients. All 28 pass. |
| **20** | **Mid-game rejoin tests** | ✅ **Done** | 6 integration tests in `tests/integration/rejoin.integration.test.ts` covering: mid-game disconnect+rejoin restores player, rejoin receives STATE_UPDATE, wrong playerId/roomId fails gracefully, double disconnect/reconnect cycle, JOINED event emission. Pre-existing integration tests (`socket.integration.test.ts`) also fixed (wrong field names, absent `disconnected` field). 9/9 integration tests pass. |
| **21** | **Build output runnable server** | ✅ **Done** | `npm run build` passes (type-check + Vite client bundle). `npm start` runs server from TS source via `node --loader ts-node/esm ./start-server.ts`. `npm run build:smoke` runs full pipeline: type-check → Vite client bundle → start server → curl `/health`. Fixed: `services/` added to `tsconfig.build.json` include, `.js` extensions on bot imports, null narrowing in `socketService.ts`, `babel-plugin-transform-import-meta` for Jest integration tests. |

## Oversight Fixes for "Done" Items
Audit date: 2026-02-28 — items marked Done that had residual gaps.

### Item 2: Client socket not generically typed — ✅ Fixed
**Problem:** Server uses `TypedServer`/`TypedSocket` aliases from `ClientToServerEvents`/`ServerToClientEvents`, but the client `io()` call did not pass these generics.
**Resolution:** Added `TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>` alias in `public/scripts/state.ts`. All three `io()` return sites cast to `TypedSocket`; `initSocket()` returns `Promise<TypedSocket>`. Event interfaces imported from `src/shared/events.js`.

### Item 8: Rejoin uses `sessionStorage` (tab-scoped) — ✅ Fixed
**Problem:** `sessionStorage` is lost when the tab/browser closes. A player who loses their tab cannot rejoin.
**Resolution:** Replaced `sessionStorage` with `localStorage` using a `TOPTHAT_SESSION` namespaced key. Session data stored as JSON with a `savedAt` timestamp; `loadSession()` checks a 1-hour TTL and discards stale data. Added `clearSession()` export for use on game-over/join flows.

### Item 10: `destroy()` doesn't clean up socket listeners — ✅ Fixed
**Problem:** `GameController.destroy()` emitted `SESSION_ERROR` and removed players from the room, but never called `socket.removeAllListeners()`. Dangling listeners could leak if the server object survives.
**Resolution:** `destroy()` now calls `socket.removeAllListeners()` on each player socket before `socket.leave()`, and clears `this.socketIdToPlayerId` after the loop.
**Remaining:** Add a unit test in `gameFlow.test.ts` that calls `destroy()` and verifies listeners are removed.

### Item 13: Residual hardcoded timing values — ✅ Fixed
**Problem:** A few timing values were still magic numbers instead of importing from `src/shared/constants.ts`.
**Resolution:** Added `STARTUP_LOCK_FALLBACK_MS` (12000) and `POST_REJOIN_BOT_DELAY_MS` (250) to `src/shared/constants.ts`. `GameController.ts` `getStartupLockDurationMs()` and `clearStartingLock()` now import and use these constants.
**Remaining:** Audit client files for remaining literals (`300ms` toast fade, `20000ms` socket timeout, `4000ms` victory animation) and promote any that affect gameplay feel to `constants.ts`.

---

## Suggested Additions to Roadmap
Identified during 2026-02-28 audit. Not currently tracked.

---

# 🔮 Comprehensive Roadmap v2

> Full-codebase audit completed 2025-07-24. 100+ findings across server, client, CSS, game logic, and test suite.
> Organized into phases by priority. Each item references specific files and line numbers.

---

## 🔴 Phase 5: Critical Game Logic & Security Fixes

Items that break core gameplay or expose security vulnerabilities. Fix first.

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **22** | **Fix four-of-a-kind across multiple plays** | 🔴 Critical | Game Rule Bug | `isFourOfAKindOnPile()` in `GameState.ts` L134-139 exists but is **never called**. When 4-of-a-kind accumulates across multiple plays (e.g., P1 plays two 8s, P2 plays two 8s), the pile never burns. Additionally, the method uses raw `===` instead of `normalizeCardValue()`, so mixed string/number values would miss matches. **Fix:** Call `isFourOfAKindOnPile()` in `handlePlayCardInternal` after adding cards to the pile (~L1410). Use `normalizeCardValue()` in the comparison. |
| **23** | **Fix XSS in game log (innerHTML + player names)** | 🔴 Critical | Security | `renderGameLog()` in `render.ts` ~L170 interpolates `entry.message` into `innerHTML`. Player names are user-supplied. A name like `<img src=x onerror=alert(1)>` executes JS in all clients. **Fix:** Replace `.map().join()` innerHTML approach with `createElement` + `textContent`. |
| **24** | **Fix XSS in victory animation** | 🔴 Critical | Security | `animateVictory()` in `render.ts` ~L2102 uses `${playerName}` in an innerHTML template literal. **Fix:** Use `createElement` + `textContent` for the winner name. |
| **25** | **Sanitize player names server-side** | 🔴 Critical | Security | No server-side name sanitization in `validation.ts` or `GameController.ts`. Names are only trimmed. Add HTML entity escaping and dangerous character stripping on the server before storing. Also add XSS-safe rendering (via `textContent`) everywhere names appear client-side. |
| **26** | **Fix 5-copies-2 not resetting pile** | 🔴 Critical | Game Rule Bug | In `CardLogic.ts` ~L68-98, when a 5 copies a 2, the code emits `SPECIAL_CARD_EFFECT { type: 'two' }` but does NOT call `gameState.resetPileForTwo()`. The event fires but no game state change occurs. **Fix:** Add the actual pile reset logic when the copied card is a 2. |
| **27** | **Lock down CORS for production** | 🔴 High | Security | `server.ts` has `cors: { origin: '*' }`. Any origin can connect. **Fix:** Restrict to known origins or same-origin. Use environment variable for allowed origins. |
| **28** | **Add global error handlers** | 🔴 High | Security | No `process.on('unhandledRejection')` or `process.on('uncaughtException')`. A single unhandled promise rejection could crash the server. **Fix:** Add handlers with logging in `start-server.ts`. |
| **29** | **Fix `validateJoinPayload` input validation gaps** | 🔴 High | Validation | `src/shared/validation.ts` has no upper-bound check on `numHumans`/`numCPUs` (max 4 total), no type checking (string values like `"2"` concatenate instead of add), no negative number validation. **Fix:** Add `MAX_TOTAL_PLAYERS` enforcement, `typeof === 'number'` guards, and `>= 0` checks. |

---

## 🟠 Phase 6: Server Robustness & Race Conditions

Fixes for race conditions, resource leaks, and edge cases that can break ongoing games.

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **30** | **Fix double-action window during turn transition** | 🟠 High | Race Condition | `handlePickUpPile` bypasses turn-transition lock (`includeTurnTransition: false`). After playing a card, the same player can emit `PICK_UP_PILE` during the 400ms+ transition window. **Fix:** Add a per-turn "action already taken" flag cleared only in `handleNextTurn`. |
| **31** | **Prevent play/pickup interleave** | 🟠 High | Race Condition | `PLAY_CARD` and `PICK_UP_PILE` can interleave during turn transition since they lock on different conditions. **Fix:** Use a single unified action lock. |
| **32** | **Add destroyed sentinel to GameController** | 🟠 Medium | Resource Leak | Timers can fire after `destroy()` is called — no `destroyed` flag to early-return. **Fix:** Add `private destroyed = false`, set in `destroy()`, check at the top of all timer callbacks and async handlers. |
| **33** | **Guard recursive `handleNextTurn`** | 🟠 Medium | Edge Case | When encountering disconnected players, `handleNextTurn` calls itself recursively. If all players disconnect simultaneously, this loops until stack overflow. **Fix:** Convert to iterative loop with `maxAttempts = players.length`. |
| **34** | **Clear stale `player.socketId` on disconnect** | 🟠 Medium | State Bug | When a player disconnects, `player.disconnected = true` is set but `player.socketId` retains the old value. If the socket ID is reused by a different connection, cross-wiring occurs. **Fix:** Set `player.socketId = null` on disconnect. |
| **35** | **Fix `removeAllListeners(event)` scope** | 🟠 Medium | Resource Leak | `socket.removeAllListeners(EVENT)` in `destroy()` removes ALL handlers for that event on the socket, including handlers from other rooms if a socket were in multiple rooms. **Fix:** Use named handler references and `socket.off(event, handler)` instead. |
| **36** | **Fix port-retry server/io leak** | 🟠 Medium | Resource Leak | In `server.ts`, the port-retry loop on `EADDRINUSE` creates a new `http.Server` + `socket.io.Server` each attempt. Previous instances are not closed. **Fix:** Close the failed server before retrying. |
| **37** | **Fix double signal handler registration** | 🟠 Low | Operational | Both `start-server.ts` and `server.ts` register `SIGINT`/`SIGTERM` handlers. Signal fires both cleanup paths in unpredictable order. **Fix:** Register only in the entrypoint (`start-server.ts`). |
| **38** | **Add timeout to client `joinGameViaLink` polling** | 🟠 Medium | Bug | `socketService.ts` ~L127-145 has `setInterval` polling for socket connection that never times out. **Fix:** Add a 10-second timeout and reject with an error. |

---

## 🟡 Phase 7: Client-Side Bugs & Animation Fixes

Bugs and UX issues visible during gameplay.

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **39** | **Fix `formatCardValue` string/number comparison** | 🟡 High | Bug | `render.ts` ~L177-182 uses strict `===` to compare card values. If `card.value` is string `"10"`, comparison `value === 10` fails — special card emoji formatting never shows. **Fix:** Normalize to number first: `const v = Number(value)`. |
| **40** | **Remove duplicate animation state variables** | 🟡 High | Code Smell | `socketService.ts` L71-75 declares `isAnimatingSpecialEffect`, `isAnimatingPilePickup`, `lockedSpecialEffectState`, `pendingStateUpdate`, `cardsBeingAnimatedPlayerId` — shadowing the same variables in `animationQueue.ts`. Some are written but never read. **Fix:** Remove from socketService, delegate to animationQueue exports. |
| **41** | **Fix dead `DOMContentLoaded` listener** | 🟡 High | Bug | `events.ts` ~L1012 registers `DOMContentLoaded` listener inside `initializePageEventListeners()`, which is called AFTER DOMContentLoaded has already fired. The callback (`updatePlayerSilhouettes()`) **never executes**. **Fix:** Call `updatePlayerSilhouettes()` directly. |
| **42** | **Fix duplicate menu systems** | 🟡 High | Bug | `events.ts` ~L991-1001 references `#game-menu-dropdown` while `render.ts` creates a separate menu system using `#table-menu-panel`/`#table-menu-button`/`#table-menu-backdrop`. Two competing implementations targeting different DOM elements. **Fix:** Remove one and consolidate. |
| **43** | **Fix `SPECIAL_CARD_EFFECT` dead while-loop** | 🟡 High | Bug | `socketService.ts` ~L345-355, the 5-copy rendering block has `while (!aqDebugSnapshot && ...)` but `aqDebugSnapshot` is a function reference (always truthy). The loop body never executes. **Fix:** Check the correct state value. |
| **44** | **Guard socket handler duplication on reconnect** | 🟡 High | Memory Leak | `initializeSocketHandlers()` registers 9+ handlers with `socket.on()` but has no cleanup. If called twice (reconnect/hot reload), all handlers duplicate. **Fix:** Call `socket.off()` before `socket.on()`, or guard with a flag. |
| **45** | **Fix `updateCenterArea` early-return scope** | 🟡 Medium | Bug | `render.ts` ~L583-587, a `return` statement is misaligned inside `if (playStack)` block instead of the outer `if (!isGameStarted)` block. When `!isGameStarted && !playStack`, execution falls through to draw pile rendering. **Fix:** Fix bracing. |
| **46** | **Fix `isMyTurn` DOM fallbacks** | 🟡 Medium | Bug | `gameControls.ts` ~L10-28 falls back to DOM checks (`.card-img.selectable`, `#my-area.active`) when game state is unavailable. These can return stale results allowing out-of-turn play attempts. **Fix:** Rely solely on authoritative game state. |
| **47** | **Prevent accidental pile pickup on mobile** | 🟡 Medium | UX | `gameControls.ts` ~L296-301 wires `#discard-pile` as a take trigger. On mobile, misclicks easily pick up the pile with no confirmation. **Fix:** Require long-press or double-tap on mobile. |
| **48** | **Remove dead code stubs** | 🟡 Low | Dead Code | `render.ts` L2123-2124: empty exported `playArea()` and `lobbyLink()` functions. `events.ts` ~L480-500: empty `updatePlayerRequirementMessage()` and `updateNameValidationMessage()` still called from multiple places. **Fix:** Remove stubs and call sites. |
| **49** | **Fix `activeFlyPromise` single-variable race** | 🟡 Low | Bug | `render.ts` ~L100-103: Multiple concurrent animations overwrite `activeFlyPromise`, losing the first promise. **Fix:** Use a counter or `Set` of promises. |

---

## 🟡 Phase 8: CSS & Layout Fixes

Visual inconsistencies, responsive breakpoint gaps, and styling issues.

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **50** | **Add focus indicators to game board** | 🟡 High | Accessibility | Zero `:focus` or `:focus-visible` rules in `game-board.css` for cards, action buttons, or menu. Keyboard users can't see what's focused. **Fix:** Add `:focus-visible` outlines to `.selectable`, `.action-button`, `#table-menu-button`, etc. |
| **51** | **Fix flying card size mismatch on mobile** | 🟡 Medium | CSS | `game-board.css` ~L739: `.flying-card` has hardcoded `width: 90px; height: 126px`. On mobile where `--card-w` is ~56px, flying cards are much larger than destination cards. **Fix:** Use `var(--card-w)` and `var(--card-h)`. |
| **52** | **Fix mobile portrait hiding opponents** | 🟡 Medium | Layout | `game-board.css` ~L1074-1120: `@media (max-width: 767px) portrait` hides `#opponent-area-left` and `#opponent-area-right` entirely. In 3-4 player games, left/right opponents become invisible. **Fix:** Show all opponents in `#opponent-area-top` with scrolling, or add a swipe/tab mechanism. |
| **53** | **Fix tablet portrait breakpoint gap** | 🟡 Low | Layout | No breakpoint covers 768px-1024px portrait. iPad-sized screens in portrait fall through to desktop layout. **Fix:** Add tablet portrait media query. |
| **54** | **Fix special card icon overflow on mobile** | 🟡 Low | CSS | `render.ts` ~L1374-1378: `showCardEvent()` uses inline `width: 70px; height: 70px` for special icons. Overflows on small screens. **Fix:** Use CSS class with `clamp()`/`vmin` sizing. |
| **55** | **Consolidate `!important` wars in lobby CSS** | 🟡 Low | CSS | `lobby.css`: Multiple places use `!important` on `.lobby-tab-button` font-size, font-family, padding, min-width (L184-203). **Fix:** Consolidate selectors, use specificity ordering instead. |
| **56** | **Merge duplicate `#lobby-container` rules** | 🟡 Low | CSS | `style.css` ~L102-115: `#lobby-container` defined twice with 11 `!important` declarations. **Fix:** Merge into single rule. |
| **57** | **Fix scrollbar gutter on mobile** | 🟡 Low | CSS | `style.css` ~L79-85: `scrollbar-gutter: stable` reserves space for non-existent scrollbars on mobile browsers. **Fix:** Use `@supports` conditional or remove the `margin-right` hack. |
| **58** | **Remove duplicate CSS variable** | 🟡 Low | CSS | `style.css` ~L56: `--accent-secondary: #1f7a6d` declared twice in `:root`. |
| **59** | **Clean up dead commented CSS** | 🟡 Low | Dead Code | `game-board.css` ~L1450-1470: Large commented-out block for old `.center-piles` tray implementation. |

---

## 🟢 Phase 9: Visual Regressions (Known)

Items from the existing regression list. Verify and fix.

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **60** | **Fix player hand cards clipping** | 🟢 Medium | Layout | Player hand cards are too close to the section above; when raised on hover/select they get cut off. **Fix:** Add more vertical space / safe area above hand. |
| **61** | **Fix CPU hand cards not fanned** | 🟢 Medium | Layout | CPU hand cards display separated instead of fanned like the player's hand. **Fix:** Apply the same fan/overlap CSS to CPU hand areas. |
| **62** | **Fix card animation flow direction** | 🟢 Medium | Animation | When playing from hand, cards should fly from hand → pile. When playing from up/down cards, cards should fly from that stack → pile. When picking up pile, cards should fly to the correct player area. Currently flies from wrong origin/destination. |
| **63** | **Fix special card animation timing** | 🟢 Medium | Animation | Special card effects (burn, reset, copy) not working correctly. Suspected timing/sequence issue between animation completion and server state transitions. Verify animation queue coordination with `SPECIAL_CARD_EFFECT` events. |
| **64** | **Fix up/down card removal for CPU** | 🟢 Medium | Rendering | When a CPU plays an up/down card, the card visually remains instead of being removed. May also affect human player up/down rendering. |

---

## 🔵 Phase 10: Bot Intelligence & Determinism

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **65** | **Replace `Math.random()` with seedable RNG in bot** | 🔵 High | Determinism | `DefaultBotStrategy.ts` L56, L117 use `Math.random()` directly instead of `getRandom()` from `utils/rng.ts`. Breaks deterministic Playwright test reproducibility. **Fix:** Import and use `getRandom()`. |
| **66** | **Add bot strategy intelligence** | 🔵 Medium | Bot AI | Bot picks randomly from all valid plays. No heuristics: doesn't prefer low cards, doesn't save 10s for large piles, doesn't prefer multi-card plays. **Fix:** Add priority: lowest non-special → multi-card (burn triples/pairs) → save 10s/2s. |
| **67** | **Add configurable bot difficulty levels** | 🔵 Low | Bot AI | Currently only `DefaultBotStrategy` exists. **Fix:** Add `EasyBotStrategy` (random, current behavior) and `HardBotStrategy` (optimized play + bluffing awareness). Allow selection in lobby. |

---

## 🔵 Phase 11: Test Coverage Expansion

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **68** | **Add `DefaultBotStrategy` unit tests** | 🔵 Critical | Testing | Zero tests for the bot. Need tests for: empty pile plays, hand/upCard/downCard zone selection, group plays, random choice with seeded RNG, pickup decision. |
| **69** | **Add `animationQueue.ts` unit tests** | 🔵 High | Testing | Complex state machine (13 exports) with zero tests. Test: queue overflow, double-finish, force unlock during active animation, buffer state, burn hold scheduling, `clearAll()` recovery. |
| **70** | **Add `gameControls.ts` unit tests** | 🔵 High | Testing | Core user interaction path is untested. Test: card selection, play/take click handling, `isMyTurn()` logic, double-click behavior, mobile touch events. |
| **71** | **Add `validateJoinPayload` dedicated unit tests** | 🔵 High | Testing | No dedicated tests. Need: max name length (20 chars), exactly-21 chars rejection, `numHumans=0`/`numCPUs=2`, negative integers, floating point, NaN, missing fields, string numbers ("2"). |
| **72** | **Add `utils/rng.ts` unit tests** | 🔵 High | Testing | Seedable RNG module has zero tests. Need: `setSeed()` reproducibility, `getRandom()` distribution, edge cases (seed=0, seed=NaN, seed=string). |
| **73** | **Fix false-positive test in `main.test.ts`** | 🔵 High | Testing | `main.test.ts` ~L176 uses `setTimeout(() => { expect(...) }, 10)` — the assertion runs after the test completes and never actually fails. **Fix:** Use `await`/`waitFor` pattern. |
| **74** | **Add bot turn end-to-end integration test** | 🔵 High | Testing | Zero test coverage for the full cycle: `handleNextTurn()` → `playComputerTurn()` → `calculateMove()` → `handlePlayCardInternal()` → state update → next turn. |
| **75** | **Add `CardLogic.handleSpecialCard` edge case tests** | 🔵 Medium | Testing | Missing: 5 with no `lastRealCard` (null), 5-copies-5 (recursive), non-special card no-op, multiple special cards in one play (pair of 2s, pair of 10s). |
| **76** | **Add game-over through actual gameplay test** | 🔵 Medium | Testing | No test plays cards through all three zones (hand → upCards → downCards) until a player legitimately empties all zones and triggers GAME_OVER. |
| **77** | **Add deck exhaustion mid-game test** | 🔵 Medium | Testing | No test verifies correct behavior when the deck runs out during play (draw fails after pickup). |
| **78** | **Add concurrent play race condition test** | 🔵 Medium | Testing | No test for two rapid `PLAY_CARD` events from the same player arriving before turn transition. |
| **79** | **Add client→server round-trip integration test** | 🔵 Medium | Testing | No test for the full chain: user clicks card → `gameControls` emits `PLAY_CARD` → server processes → `STATE_UPDATE` → client renders. |
| **80** | **Add animation queue + socketService integration test** | 🔵 Medium | Testing | Animation queue gates state updates to DOM. No test for: server event → socketService handler → animationQueue buffering → render. |
| **81** | **Eliminate `any` types in test-adjacent code** | 🔵 Low | Code Quality | `animationQueue.ts` has 5 `any` uses, `state.ts` has 6 `any` uses, `render.ts` has `getPlayerDisplayName(playerId, players: any[])`. All violate the "no any" rule. |

---

## 🟣 Phase 12: Security Hardening

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **82** | **Rate limit socket events** | 🟣 Medium | Security | No rate limiting on `JOIN_GAME`/`PLAY_CARD`/`PICK_UP_PILE` events. A single client could spam events. **Fix:** Add per-socket event throttle via Socket.IO middleware. |
| **83** | **Rate limit and validate `/api/feedback`** | 🟣 Low | Security | Accepts arbitrary JSON, no validation or throttle. **Fix:** Add JSON schema validation + `express-rate-limit`. |
| **84** | **Stop exposing CPU hands via DevTools** | 🟣 Medium | Security | `getPublicView` sends computer player hands to all clients. Visible in DevTools Network tab. **Fix:** Mask CPU hands the same way human opponents' hands are masked. |
| **85** | **Remove `eval()` in `main.ts`** | 🟣 Low | Security | `_getViteMode()` uses `eval()` to check for `import.meta`. Flags in security audits. **Fix:** Use `try { new Function('return import.meta') }` or a build-time define. |

---

## 🟣 Phase 13: Accessibility

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **86** | **Add ARIA labels to game cards** | 🟣 Medium | Accessibility | Cards lack `aria-label`/`role` attributes. **Fix:** Add `role="button"` and descriptive labels (e.g., "7 of Hearts, selectable"). |
| **87** | **Add screen reader live region** | 🟣 Medium | Accessibility | No `aria-live` region for game events (whose turn, card played, special effect). **Fix:** Add `aria-live="polite"` region updated on each game event. |
| **88** | **Add keyboard card navigation** | 🟣 Medium | Accessibility | No keyboard navigation for selecting/playing cards. **Fix:** Add tab focus + Enter/Space to select/play. Arrow keys to navigate between cards. |

---

## 🟣 Phase 14: Code Quality & Cleanup

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **89** | **Promote magic numbers to constants** | 🟣 Low | Code Quality | Hand size (3), max players (4), room ID length (6), game log max entries (5), retry counts, timer durations — scattered as magic numbers. **Fix:** Move to `src/shared/constants.ts`. |
| **90** | **Fix `normalizeCardValue` three-way nullability** | 🟣 Low | Code Quality | `cardUtils.ts`: `normalizeCardValue` handles `null`, `undefined`, and `string` inconsistently. **Fix:** Define a single nullability contract — return `null` for nullish input, `number` for valid input, throw for invalid. |
| **91** | **Fix `createStateSnapshot` mutation safety** | 🟣 Low | Code Quality | `GameState.createStateSnapshot` exposes direct object references. State received by callers can be mutated. **Fix:** Deep clone player arrays, card arrays, etc. |
| **92** | **Fix `dealCards` silent under-deal** | 🟣 Low | Code Quality | `GameState.dealCards` silently deals fewer cards than expected when the deck is insufficient. **Fix:** Log a warning or throw when deck is too small. |
| **93** | **Remove external card API fallback** | 🟣 Low | Code Quality | `render.ts` ~L354-405: `cardImg()` has fallback to `deckofcardsapi.com`. External dependency that slows rendering or fails offline. **Fix:** Remove or make opt-in. |
| **94** | **Reduce silhouette flicker on counter change** | 🟣 Low | UX | `events.ts` ~L388-400: `updateSilhouettesInContainer` does `innerHTML = ''` then rebuilds all silhouettes on every change. Causes avatar image reload flicker. **Fix:** Diff existing children instead of clearing. |
| **95** | **Add user-visible init error fallback** | 🟣 Low | UX | `main.ts` ~L136-141: `try/catch` around initialization only logs error. User sees blank page. **Fix:** Show visible error message. |
| **96** | **Fix `socketReady` stale reference on reconnect** | 🟣 Low | Code Quality | `state.ts` ~L60-62: `socketReady` resolves once and never resets. After disconnect/reconnect, it points at the old socket. **Fix:** Reset on disconnect. |
| **97** | **Add unhandled rejection handling in animation callbacks** | 🟣 Low | Code Quality | `animationQueue.ts` ~L155-173: `scheduleBurnHold` invokes async callbacks whose rejections are silently swallowed. **Fix:** Add `.catch()`. |
| **98** | **Remove duplicate deal animation logic in tutorial** | 🟣 Low | Code Quality | `TutorialController.ts` ~L109-130: `playTutorialDealAnimation()` duplicates `dealing-animation.ts` phase A/B/C/D structure. **Fix:** Extract shared animation primitives. |
| **99** | **Fix tutorial event listener leaks** | 🟣 Low | Memory Leak | `TutorialController.ts`: constructor adds `resize` listener (~L48-55) and `interceptGameControls` adds 3 capture listeners (~L878-925). None removed in `finishTutorial()`. **Fix:** Store handler references and remove in cleanup. |
| **100** | **Promote remaining client timing literals to constants** | 🟣 Low | Code Quality | `300ms` toast fade, `20000ms` socket timeout, `4000ms` victory animation, `50ms` polling intervals — still hardcoded in client files. **Fix:** Import from `src/shared/constants.ts`. |

---

## 📊 Phase 15: Operational & Monitoring

| # | Task | Priority | Category | Details |
|:--|:------|:---------|:---------|:--------|
| **101** | **Add structured logging** | 🟣 Low | Operational | Replace `console.log` throughout with a structured logger (pino/winston) for production debugging. |
| **102** | **Add E2E happy-path smoke test** | 🟣 Medium | Testing | Single Playwright test: host → join → play one round → game over. Catches most regressions cheaply. |
| **103** | **Increase game log capacity** | 🟣 Low | UX | `render.ts` ~L132-145: `MAX_LOG_ENTRIES = 5` is very small. Players can't review recent plays in longer games. **Fix:** Increase to 20-50 or make scrollable. |

---

## Summary

| Phase | Focus | Items | Critical | High | Medium | Low |
|:------|:------|:-----:|:--------:|:----:|:------:|:---:|
| **5** | Critical Game Logic & Security | 8 | 5 | 3 | 0 | 0 |
| **6** | Server Robustness & Race Conditions | 9 | 0 | 3 | 5 | 1 |
| **7** | Client-Side Bugs & Animations | 11 | 0 | 6 | 3 | 2 |
| **8** | CSS & Layout Fixes | 10 | 0 | 1 | 3 | 6 |
| **9** | Visual Regressions (Known) | 5 | 0 | 0 | 5 | 0 |
| **10** | Bot Intelligence & Determinism | 3 | 0 | 1 | 1 | 1 |
| **11** | Test Coverage Expansion | 14 | 1 | 6 | 5 | 2 |
| **12** | Security Hardening | 4 | 0 | 0 | 2 | 2 |
| **13** | Accessibility | 3 | 0 | 0 | 3 | 0 |
| **14** | Code Quality & Cleanup | 12 | 0 | 0 | 0 | 12 |
| **15** | Operational & Monitoring | 3 | 0 | 0 | 1 | 2 |
| **Total** | | **82** | **6** | **20** | **28** | **28** |
