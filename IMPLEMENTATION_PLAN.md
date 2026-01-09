# Implementation Plan

This doc captures the next wave of work after stabilizing tooling and adding local card assets.

## Status Snapshot

- **Linting:** Completed (ESLint runs cleanly and Prettier is decoupled).
- **Local card assets:** Completed for assets generation (52 faces + back downloaded into `public/assets/cards/`).

## 1) Batch Renders (requestAnimationFrame)

### Goal

Reduce UI jank and DOM churn by coalescing rapid socket events into a single render per animation frame.

### Proposed Strategy

1. **Introduce a tiny render scheduler** in the client (likely `public/scripts/renderScheduler.ts` or inside `socketService.ts`):
   - Keep a single `pendingState: GameStateData | null`.
   - Keep a single `rafId: number | null`.
   - `scheduleRender(nextState)` sets `pendingState = nextState` and requests a frame if not already scheduled.
   - In the frame callback, call `renderGameState(pendingState, myId)` once and clear `pendingState/rafId`.

2. **Where to hook it**
   - In `public/scripts/socketService.ts`, replace direct `renderGameState(s, state.myId)` in `STATE_UPDATE` with `scheduleRender(s)` when we are not in a queue/special-effect lock.
   - Keep the current queue/special-effect buffering rules, but when releasing buffers:
     - call `scheduleRender(latestState)` instead of multiple immediate renders.

3. **Ensure special-effect correctness**
   - Special effects (e.g., `5` copy shingle) may require rendering a specific “post-effect” state before allowing later states.
   - Keep the “locked post-effect state” concept and schedule that exact state during the effect window.

### Success Criteria

- Rapid CPU turns don’t cause repeated “full table reflows” per socket event.
- Visual sequencing remains correct (no turn-arrow jumping ahead during fly/effect).

## 2) Local Cards (switch `render.ts` to use `public/assets/cards/`)

### Goal

Eliminate runtime dependency on remote card images (performance, reliability, offline dev).

### Current State

- `scripts/download_cards.ts` downloads images to `public/assets/cards/`.
- Card assets are named to match current code generation (`AS.png`, `0H.png`, etc.).

### Proposed Steps

1. **Add a local-first URL builder** in `public/scripts/render.ts`:
   - For a face card code like `AS`, use `/assets/cards/AS.png`.
   - Keep remote URLs as fallback if local asset fails to load (optional, but helpful).

2. **Preload (optional)**
   - On initial game start, preload the 52 images in the background to reduce “pop-in”.

3. **Verify**
   - Confirm cards render correctly in dev + production build.
   - Confirm no CORS/network dependency remains for cards.

## 3) Tame Logging (dev-only wrapper)

### Goal

Keep debug logs useful in development without polluting production or tests.

### Vite Flag Availability

- In Vite client bundles, `import.meta.env.DEV` is available and is the cleanest switch for dev-only logging.

### Proposed Implementation

1. Add a tiny helper in client code (e.g., `public/scripts/devLog.ts`):
   - `export const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };`
   - Same idea for `devWarn/devError` if needed.

2. Replace noisy `console.log` calls in hot paths with `devLog`.

## 4) Mobile UI Overhaul (S25 Ultra portrait)

This is intentionally not implemented in this doc; see the open tasks list for the concrete CSS + UI changes to apply.
