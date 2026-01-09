# PROJECT MANIFEST: "TOP THAT" (Card Game)

This repository is the long-term refactor of **Top That** into a clean, strict, maintainable TypeScript codebase.
If you only read one file before making changes, read this.

## 0. HOW TO USE THIS MANIFEST

- **New/modified code must follow this manifest.** If existing code violates it, fix the root cause when you are already in that area (don’t paper over it).
- **When changing runtime data shapes**, update this manifest _and_ the shared types (`src/shared/types.ts` and re-export `src/types.ts`).
- **Avoid “Frankenstein” accumulation:** prefer deleting obsolete patterns over adding parallel ones.
- **Terminology:** be consistent. Use **Deck / Draw Pile** for the face-down pile you draw from, and **Play Pile / Discard Pile** for the center stack. If code uses legacy names (e.g., `pile`), prefer migrating toward these terms when touching that area.

---

## 1. CORE PRINCIPLES

- **Strict TypeScript:** All new code must be TypeScript. Existing legacy JavaScript files are deprecated and must be removed or converted when touched.
- **No `any`:** Avoid using `any`. Prefer strict interfaces/types and `unknown` + narrowing when needed.
- **Mobile-First Responsive:** All UI changes must work on mobile (vertical layout) and desktop (horizontal layout).
- **Client-Server Separation:** Game logic lives exclusively on the Server (`GameController`, `GameState`). The Client (`public/`) is purely for presentation and user input.
- **Single Source of Truth:** The Server (`GameState`) is the absolute authority. The UI must never invent state or predict outcomes locally.
- **Consistency:** Prefer patterns that match the existing codebase (e.g., `GameController` patterns) over introducing new architectural styles.

## 2. TECH STACK

- **Language:** TypeScript (Strict Mode)
- **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JS/TS (No heavy frameworks unless specified).
- **Styling:** CSS variables for theming (Royalty theme).
- **Build/Deploy:** Vite build, Render.com deployment.
- **Transport:** Socket.IO (client/server).
- **Tests:** Jest (`jsdom`) for client, plus unit tests for pure logic where possible.

## 3. CODING STANDARDS

- **Constants:** Do not use magic numbers/strings. Use named constants (events, card rules, timings).
- **Functions:** Small, single-purpose functions. If a function is over ~50 lines, refactor it.
- **Comments:** Comment _why_ complex logic exists, not _what_ the code is doing.
- **Error Handling:** Fail gracefully. If the UI crashes, the game state should remain intact.
- **Layering:** UI code must not call `socket.emit` directly. Use the client application/wrapper utilities already established in this repo.
- **ESM Imports:** Repo is ESM; use `.js` import extensions even from `.ts` sources (match existing patterns).
- **Assets:** Import assets in TS so Vite can hash them; do not hardcode `/assets/...` paths unless the repo already does for that exact asset.

## 4. CURRENT CONTEXT

- **Avatars:** Emoji-based avatars (Royal theme) handled by `avatarManager.js`.
- **Game Loop:** Uses a **Play Pile** (active center) and **Draw/Deck** (face-down).
- **AI Players:** Bots use randomized Royalty identities.

## 5. INSTRUCTION TO AI (AND HUMANS USING AI)

- **Role:** Senior TypeScript Engineer.
- **Refactoring:** If you see a hacky solution in existing code, flag it and suggest a refactor.
- **UI Integrity:** Do not generate code that breaks existing CSS flex/grid structures.
- **Verification:** Before finalizing, ask: “Does this maintain strict type safety and preserve architecture boundaries?”
- **No Silent Drift:** If instructions/docs conflict, resolve the conflict (don’t stack another workaround).
- **The “Data-Driven Challenger” Clause:**
  - You ARE permitted to suggest a deviation from these standards (e.g., a new library or architecture change) ONLY if you can provide a “Reason for Change” based on concrete data.
  - **Requirement:** You must explicitly state: “I am proposing a deviation from standard because [DATA/REASON].”
  - **Prohibition:** Do not suggest changes just because they are “easier” or “shorter.”

## 6. TYPE DEFINITIONS (SOURCE OF TRUTH)

All _new_ code should converge toward these interfaces. Do not expand the runtime data model without updating this manifest.

> Note: The repo currently contains legacy/shared types in `src/shared/types.ts`. This section describes the actual current model (and the naming we want across the codebase).

/_ --- Card & Deck --- _/
type CardValue = string | number;

interface Card {
value: CardValue;
suit: string;
back?: boolean;
copied?: boolean;
}

/_ --- Player State (Client View) --- _/
interface ClientStatePlayer {
id: string;
name: string;
avatar?: string;
handCount?: number;
upCount?: number;
downCount?: number;
hand?: Card[];
upCards?: Array<Card | null>;
downCards?: Card[];
downCardsHidden?: number;
disconnected?: boolean;
isComputer?: boolean;
error?: string;
}

/_ --- Game State --- _/
interface GameStateData {
players: ClientStatePlayer[];
pile: Card[];
discardCount: number;
deckSize: number;
currentPlayerId?: string;
started: boolean;
lastRealCard: Card | null;
}

/_ --- Lobby --- _/
interface LobbyPlayer {
id: string;
name: string;
avatar?: string;
status: 'host' | 'invited' | 'joined' | 'ready';
isComputer?: boolean;
isSpectator?: boolean;
}

interface InSessionLobbyState {
roomId: string;
hostId: string | null;
players: LobbyPlayer[];
started?: boolean;
expectedHumanCount?: number;
expectedCpuCount?: number;
}
