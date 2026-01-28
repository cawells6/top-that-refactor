# 🏁 Top That! Refactor Roadmap Tracker

**Current Phase:** Phase 1 - Server Hardening & Validation
**Next Priority:** #4 (Typed Event Payloads)

## 🔍 Phase 1: Server Hardening & Validation
| Priority | Task | Status | Verification Criteria (How to Test) |
| :--- | :--- | :--- | :--- |
| **1** | **Server-authoritative validation** | ✅ **Done** | Playing an invalid card via console/hack triggers a forced pickup (does not crash). |
| **2** | **Reject duplicate cardIndices** | ✅ **Done** | Sending `cardIndices: [0, 0]` results in an Error or Pickup (not infinite cards). |
| **3** | **Lock down transitions** | ✅ **Done** | Spamming moves during the 400ms "beat" is rejected by `turnLock`. |
| **4** | **Typed event payload contracts** | 🚧 **In Progress** | `src/shared/types.ts` contains all payloads. No `any` in `socketService` emits. |
| **5** | **Persistent playerId for rejoin** | ⏳ **Pending** | Rejoining the same room code restores your hand/session (cookie/localStorage). |
| **6** | **Graceful shutdown on mass disconnect** | ⏳ **Pending** | Server waits 30s after last player leaves before deleting room. |
| **7** | **Room cleanup with stale-started timeout** | ⏳ **Pending** | Rooms with no activity for X minutes are garbage collected. |

## 🧪 Phase 2: Testing & Stability
| Priority | Task | Status | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **9** | **GameController unit tests** | ⏳ **Pending** | `npm test` runs specific controller logic tests (mocking socket.io). |
| **11** | **Shared JOIN validation rules** | ⏳ **Pending** | Client and Server use same `validateJoin(payload)` function. |

## 🎨 Phase 3: UX & Gameplay Polish
| Priority | Task | Status | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **13** | **Show server error text in-game** | ⏳ **Pending** | Server `emit('error')` shows a red Toast notification in UI. |
| **14** | **Burn feedback for failed down-card** | ⏳ **Pending** | Failed blind play reveals the card to opponents before pickup. |