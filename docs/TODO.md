# TODO — Top That Refactor

This is the short list of high-value improvements to keep us from losing track between sessions.

## 1) Multi‑Card Selection Is “Finicky” (Highest Priority)
**What’s wrong today (root cause):**
- The local hand is heavily overlapped (shingled). On desktop this is “rescued” by `:hover` raising z-index, but **mobile has no hover**, so many cards are effectively hard to tap/select.
- `render.ts` has dynamic overlap/compression logic (`--hand-overlap`), but `public/styles/game-board.css` hardcodes overlap (`margin-left: -40px`) and likely overrides the dynamic system.

### Option A — “Select Mode” (Recommended)
Trigger a temporary **hand expansion mode** when the player starts selecting cards:
- On first select (or long‑press on the hand), add a class like `hand-row--selecting`.
- In selecting mode: reduce overlap, enable horizontal scroll (if needed), increase tap targets.
- Exit selecting mode after Play/Take/turn change or explicit Cancel.

**Why this is best-in-class:** high reliability on mobile, minimal permanent real-estate cost, easy mental model.

### Option B — “Tap Zones” for Shingled Hands (Keeps Compact Layout)
Keep the shingled visual layout, but make each card reliably tappable by:
- Capturing pointer/touch events on the hand row and mapping `x` position to a card index (instead of relying on DOM hit-testing through overlaps).
- Optional: clamp overlap so each card has a minimum effective tap-width.

**Why:** preserves the compact “fan” aesthetic while fixing selection precision.

### Option C — “Smart Multi-Play” (Reduces Taps)
Reduce the need to physically tap multiple cards:
- Add a “Select all matching” affordance (long‑press card, secondary toggle, or small button).
- Or: when one card is selected, provide a clear one-tap action like “+ Add all 7s”.

**Why:** fastest for the common case (playing duplicates), minimal layout change.

**Success criteria (acceptance tests):**
- Mobile: selecting any specific hand card works on first try.
- Mobile: selecting 2–4 duplicates is fast and doesn’t require pixel-perfect taps.
- Desktop: doesn’t regress hover/selection feel.

## 2) Terminology & Naming Consistency
- Standardize names across UI/logs/types: **Deck/Draw Pile** vs **Play/Discard Pile**.
- Reduce confusion by aligning variable names (`deckSize`, `pile`, DOM ids) with the chosen terminology.

## 3) CSS Ownership Cleanup (Reduce “Frankenstein” Risk)
- Consolidate local-hand layout rules to a single source (avoid `layout.css` vs `game-board.css` duplication).
- Remove duplicate/conflicting selectors for `.hand-row--local .card-container`.

