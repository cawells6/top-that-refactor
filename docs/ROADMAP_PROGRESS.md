
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
| **10** | **Room lifecycle destroy hook** | ✅ **Done** | `destroy()` methods implemented on `GameController` and `GameRoomManager` to clean up timers and socket listeners. |
| **11** | **Extract bot logic to BotService** | ✅ **Done** | Bot logic extracted to `services/bot/DefaultBotStrategy.ts`, decoupling it from `GameController`. |

## 🛠️ Phase 3: Standardization & UX
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **12** | **Dedupe isValidPlay** | ✅ **Done** | Logic centralized in `utils/cardUtils.ts`. Client-side (`public/scripts/render.ts`) now correctly imports and re-exports this function, ensuring both Client and Server use the same code. |
| **13** | **Centralize timing constants** | ✅ **Done** | All timing constants centralized in `src/shared/constants.ts` and imported across client/server. |
| **14** | **Show server error text in-game** | ✅ **Done** | `socketService.ts` listens for `ERROR` event and displays toast/visual feedback. |
| **15** | **Explicit burn feedback** | ❌ **Pending** | Server forces pickup on invalid play but doesn't emit specific "Burn" payload with revealed cards. |
| **16** | **Network Bandwidth (Quick Win)** | ❌ **Pending** | `pushState` sends full pile history. Optimization to send only `topCard + count` is missing. |
| **17** | **Break up client god files** | ✅ **Done** | Opening deal logic extracted to `OpeningDealCoordinator`. Render calls intentionally kept in socketService as part of animation sequences. |

## 🧪 Phase 4: Testing & Deployment
| # | Task | Status | Code Verification Notes |
| :--- | :--- | :--- | :--- |
| **18** | **Room cleanup with stale-started timeout** | ❌ **Pending** | `GameRoomManager` only cleans empty rooms, not stalled active games. |
| **19** | **GameController unit tests** | 🚧 **Partial** | Some tests exist in `tests/`, but coverage for edge cases is incomplete. |
| **20** | **Mid-game rejoin tests** | ❌ **Pending** | Integration tests exist but do not explicitly cover mid-game disconnect/reconnect flows. |
| **21** | **Build output runnable server** | ❌ **Pending** | `tsconfig.build.json` exists but build output verification is needed. |

## Refactor Regression List (Fix after refactor)
Added: 2026-02-01 (regressions noticed, exact change point unknown)

- Player hand cards: too close to section above; when raised they get cut off (needs more vertical space / safe area).
- CPU hand cards: displayed separated instead of fanned like the player's hand.
- Draw/pickup animation: when player/CPU take cards from the pile, cards should flow to the correct destination:
  - If playing from hand, flow to the table play area from the hand.
  - If playing from up/down cards, flow from that stack to the table play area.
- Special cards: not working correctly (suspected timing/sequence issue; verify animations vs server state transitions).
- Up/down play removal: when CPU plays an up/down card, it doesn't remove that card and reflect it correctly; may also affect player (needs observation/verification).
