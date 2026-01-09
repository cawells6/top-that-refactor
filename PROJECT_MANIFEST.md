# PROJECT MANIFEST: "TOP THAT" (Card Game)

This repository is the long-term refactor of **Top That** into a clean, strict, maintainable TypeScript codebase.
If you only read one file before making changes, read this.

## 0. HOW TO USE THIS MANIFEST

- **New/modified code must follow this manifest.** If existing code violates it, fix the root cause when you are already in that area (don’t paper over it).
- **Git Hygiene:** NEVER modify the main branch directly. Before starting any new task, you must issue the command to create a new branch using the format `git checkout -b feature/[task-name]` or `git checkout -b fix/[bug-name]`.
- **When changing runtime data shapes**, update this manifest _and_ the shared types (`src/shared/types.ts` and re-export `src/types.ts`).
- **Avoid “Frankenstein” accumulation:** prefer deleting obsolete patterns over adding parallel ones.
- **Terminology:** be consistent. Use **Deck / Draw Pile** for the face-down pile you draw from, and **Play Pile / Discard Pile** for the center stack. If code uses legacy names (e.g., `pile`), prefer migrating toward these terms when touching that area.

---

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

> Note: The repo currently contains legacy/shared types in `src/shared/types.ts`. This section describes the intended end-state model (and the naming we want across the codebase).

/_ --- Card & Deck --- _/
type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
id: string; // Unique ID (e.g., "H-10") for DOM tracking
suit: Suit;
rank: Rank;
value: number; // 2=2, J=11, A=14, etc.
isSpecial: boolean; // True for 2, 5, 10
action?: 'RESET' | 'COPY' | 'BURN'; // Undefined for normal cards
}

/_ --- Avatars (Royalty Theme) --- _/
interface Avatar {
id: string; // e.g., 'king', 'dragon'
icon: string; // Emoji: '🤴'
label: string; // Display name: 'The King'
}

/_ --- Player --- _/
interface Player {
id: string;
name: string;
isBot: boolean;
avatar: Avatar; // Strict Avatar object, not just a string
isConnected: boolean;

// Card Piles (3 layers of defense)
hand: Card[];
faceUpCards: Card[];
faceDownCards: Card[];

hasFinished: boolean; // True when all 3 piles are empty
}

/_ --- Game State --- _/
type GamePhase = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

interface GameState {
gameId: string;
phase: GamePhase;
players: Player[];

// The Piles
drawPile: Card[]; // Face-down pickup pile
playPile: Card[]; // Active center pile

// Turn Management
currentPlayerIndex: number;
direction: 1 | -1; // 1 = Clockwise, -1 = Counter-clockwise

// State Flags
lastCardPlayed: Card | null;
pileValue: number; // Current value to beat (handles the '5' Copycat logic)
}
