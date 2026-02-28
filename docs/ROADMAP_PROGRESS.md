
# 🏁 Top That! Refactor Roadmap Tracker

**Current Phase:** Phase 3 - Standardization & UX (items 15-16 remaining) / Phase 4 - Testing & Deployment
**Last Audit:** 2026-02-28
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
| **15** | **Explicit burn feedback** | ❌ **Pending** | Server forces pickup on invalid play but doesn't emit specific "Burn" payload with revealed cards. |
| **16** | **Network Bandwidth (Quick Win)** | ❌ **Pending** | `pushState` sends full pile history. Optimization to send only `topCard + count` is missing. |
| **17** | **Break up client god files** | ✅ **Done** | Opening deal logic extracted to `OpeningDealCoordinator`. Render calls intentionally kept in socketService as part of animation sequences. |

## 🧪 Phase 4: Testing & Deployment
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **18** | **Room cleanup with stale-started timeout** | ✅ **Done** | `GameRoomManager` cleanup interval has two-tier logic: empty/unstarted rooms cleaned after `EMPTY_TIMEOUT_MS`; stale started games cleaned after `STALE_TIMEOUT_MS` (30 min). Both imported from `src/shared/constants.ts`. |
| **19** | **GameController unit tests** | 🚧 **Partial** | Some tests exist in `tests/`, but coverage for edge cases is incomplete. |
| **20** | **Mid-game rejoin tests** | ❌ **Pending** | Integration tests exist but do not explicitly cover mid-game disconnect/reconnect flows. |
| **21** | **Build output runnable server** | 🚧 **Partial** | Build pipeline exists (`npm run build` → `tsc + vite build` → `npm start` from `dist/`). Postbuild extension fix in place. Missing: end-to-end smoke test of built output, no CI verification step. |

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

### Security (recommend adding as Phase 5)
| # | Task | Priority | Notes |
| :--- | :--- | :--- | :--- |
| S1 | **Lock down CORS** | High | `server.ts` has `cors: { origin: '*' }`. Restrict to known origins or same-origin for any deployment beyond localhost. |
| S2 | **Sanitize player names** | High | Names are only trimmed, never escaped. If rendered as `innerHTML` anywhere client-side, XSS is possible. Add server-side sanitization + client-side `textContent` enforcement. |
| S3 | **Rate limit socket connections** | Medium | No rate limiting on connect or events. A single client could spam `JOIN_GAME`/`PLAY_CARD`. Add per-IP connection throttle via `socket.io` middleware. |
| S4 | **Rate limit `/api/feedback`** | Low | Accepts arbitrary JSON, no validation or throttle. Add schema validation + express-rate-limit. |
| S5 | **Global error handler** | High | No `process.on('unhandledRejection')` or `process.on('uncaughtException')` in `server.ts`. A single bad socket event could crash the process. Add handler with logging. |

### Accessibility
| # | Task | Priority | Notes |
| :--- | :--- | :--- | :--- |
| A1 | **Card ARIA labels** | Medium | Game cards lack `aria-label`/`role` attributes. Add `role="button"` and descriptive labels ("7 of Hearts"). |
| A2 | **Screen reader announcements** | Medium | No live region for game events (whose turn, card played, special effect). Add `aria-live="polite"` region. |
| A3 | **Keyboard card selection** | Medium | No keyboard navigation for selecting/playing cards. Add tab focus + Enter/Space to play. |

### Operational
| # | Task | Priority | Notes |
| :--- | :--- | :--- | :--- |
| O1 | **Health check endpoint** | Low | Add `GET /health` returning 200 + uptime/room count for monitoring. |
| O2 | **Structured logging** | Low | Replace `console.log` with a structured logger (e.g. pino) for production debugging. |

### Testing
| # | Task | Priority | Notes |
| :--- | :--- | :--- | :--- |
| T1 | **E2E happy-path smoke test** | High | Single Playwright test: host → join → play one round → game over. Catches most regressions cheaply. |
| T2 | **Bot strategy unit tests** | Medium | `DefaultBotStrategy` has no dedicated tests. Add tests for hand/upCard/downCard decision branches. |
| T3 | **Build smoke test** | Medium | Script that runs `npm run build && npm start` and hits `/health` to verify the built output works. |

---

## Refactor Regression List (Fix after refactor)
Added: 2026-02-01 (regressions noticed, exact change point unknown)

- Player hand cards: too close to section above; when raised they get cut off (needs more vertical space / safe area).
- CPU hand cards: displayed separated instead of fanned like the player's hand.
- Draw/pickup animation: when player/CPU take cards from the pile, cards should flow to the correct destination:
  - If playing from hand, flow to the table play area from the hand.
  - If playing from up/down cards, flow from that stack to the table play area.
- Special cards: not working correctly (suspected timing/sequence issue; verify animations vs server state transitions).
- Up/down play removal: when CPU plays an up/down card, it doesn't remove that card and reflect it correctly; may also affect player (needs observation/verification).
