
# 🏁 Top That! Refactor Roadmap Tracker

**Current Phase:** Phase 1 - Server Hardening & Validation
**Source:** `0127 Get Well.xlsx - Sheet3.csv`

## 🔍 Phase 1: Server Hardening & Validation
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **1** | **Repo hygiene cleanup** | ✅ **Done** | Dead files removed, `.gitignore` present. |
| **2** | **Typed event payload contracts** | ✅ **Done** | `src/shared/types.ts` defines payloads. `GameController.ts` & `socketService.ts` enforce them. |
| **3** | **Server-side Protocol Validation** | ✅ **Done** | `GameController.validateRequest` & `isValidPlay` prevent illegal moves. |
| **4** | **Reject duplicate cardIndices** | ✅ **Done** | `GameController.ts` explicitly checks `Set(cardIndices).size` to block dupes. |
| **5** | **Shared JOIN validation rules** | ✅ **Done**  | Validation is currently hardcoded in `GameController.ts` (lines 280+). No shared validator module. |
| **6** | **Lock down transitions** | ✅ **Done** | `isStarting` flag implemented in `GameState` and guards `GameController` actions. |

## 🏗️ Phase 2: Lifecycle & Persistence
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **7** | **Centralize public state projection** | ✅ **Done** | `GameController.pushState` manually masks cards. Logic not yet moved to `GameState.getPublicView`. |
| **8** | **Persistent playerId for rejoin** | ✅ **Done** | `socketService.ts` persists session. `GameController` handles `REJOIN` event successfully. |
| **9** | **Graceful shutdown on mass disconnect** | ✅ **Done** | `GameController.handleDisconnect` now starts a 30s timer when the last human leaves. `handleRejoin` cancels it. |
| **10** | **Room lifecycle destroy hook** | 🚧 **In Progress** | `destroy()` methods added to `GameController` and `GameRoomManager` to clean up timers and socket listeners. |
| **11** | **Extract bot logic to BotService** | ❌ **Pending** | Bot logic is still coupled inside `GameController.ts` methods. |

## 🛠️ Phase 3: Standardization & UX
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **12** | **Dedupe isValidPlay** | ✅ **Done** | Logic centralized in `utils/cardUtils.ts` and used by both Client and Server. |
| **13** | **Centralize timing constants** | ❌ **Pending** | Magic numbers (`400`, `2000`) exist in `GameController.ts` and `socketService.ts`. |
| **14** | **Show server error text in-game** | ✅ **Done** | `socketService.ts` listens for `ERROR` event and displays toast/visual feedback. |
| **15** | **Explicit burn feedback** | ❌ **Pending** | Server forces pickup on invalid play but doesn't emit specific "Burn" payload with revealed cards. |
| **16** | **Network Bandwidth (Quick Win)** | ❌ **Pending** | `pushState` sends full pile history. Optimization to send only `topCard + count` is missing. |
| **17** | **Break up client god files** | 🚧 **Partial** | Some UI logic extracted, but `socketService.ts` still contains render logic. |

## 🧪 Phase 4: Testing & Deployment
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **18** | **Room cleanup with stale-started timeout** | ❌ **Pending** | `GameRoomManager` only cleans empty rooms, not stalled active games. |
| **19** | **GameController unit tests** | 🚧 **Partial** | Some tests exist in `tests/`, but coverage for edge cases is incomplete. |
| **20** | **Mid-game rejoin tests** | ❌ **Pending** | Integration tests exist but do not explicitly cover mid-game disconnect/reconnect flows. |
| **21** | **Build output runnable server** | ❌ **Pending** | `tsconfig.build.json` exists but build output verification is needed. |