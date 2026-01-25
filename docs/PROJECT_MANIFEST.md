# PROJECT MANIFEST: "TOP THAT" (Card Game)

This document is the **Single Source of Truth** for the Top That codebase.
If you only read one file before making changes, read this.

## 0. HOW TO USE THIS MANIFEST

- **New/modified code must follow this manifest.** If existing code violates it, fix the root cause when you are already in that area.
- **When changing runtime data shapes**, update this manifest _and_ the shared types (`src/shared/types.ts`).
- **Terminology:**
  - **Deck / Draw Pile:** The face-down pile players draw from.
  - **Play Pile / Discard Pile:** The face-up center stack players play onto.
  - **Hand:** The cards held by a player.

---

## 1. CORE ARCHITECTURE & PRINCIPLES

### **The "Golden Rule" of State**
- **Server (`GameController`, `GameState`)**: The absolute authority. It owns the deck, rules, and player stats.
- **Client (`public/`)**: A "dumb" terminal. It visualizes `STATE_UPDATE` events and sends inputs (`PLAY_CARD`). It never calculates game logic or invents state.
- **PlayerStateManager**: Handles connection quality, session metrics, and state snapshots.

### **Layered Architecture Contracts**
1.  **Network Layer (`socketService.ts`)**: Handles generic `emit/on`. Does NOT know game rules.
2.  **Controller Layer (`GameController.ts`)**: Orchestrates game flow and validates moves.
3.  **Model Layer (`GameState.ts`, `Player.ts`)**: Pure data structures and logic.

### **Event Contracts (`src/shared/events.ts`)**
- `JOIN_GAME`: Room entry.
- `LOBBY_STATE_UPDATE`: Real-time lobby sync (avatars, readiness).
- `START_GAME`: Transition to gameplay.
- `STATE_UPDATE`: The heartbeat. Contains the *entire* relevant game state.
- `PLAY_CARD`: Gameplay actions test.

### **Strict TypeScript**
- All new code must be TypeScript.
- **No `any`**: Use `unknown` + narrowing or strict interfaces.
- **ESM Imports**: Use `.js` extensions for imports (e.g., `import { x } from './file.js'`).

### **Mobile-First Responsive (The Isolation Rule)**
- All UI changes must work on vertical mobile screens.
- **Do not break Desktop to fix Mobile.** Mobile and Desktop layouts are intentionally different.
- Use `vmin` scaling where appropriate to support ultra-wide and mobile simultaneously.

---

## 2. IMMUTABLE GAME RULES (DO NOT INFER)

Game logic is code, not copy. Do not "optimize" these rules based on other card games.
1.  **Strictly Higher:** Played cards must be higher than the pile top (not equal).
2.  **The "2":** Resets the pile value. Can be played on anything.
3.  **The "5" (Copycat):** Copies the previous card's value and suit. If played on an empty pile, it is just a 5.
4.  **The "10" (Burn):** Clears/burns the pile. **Does NOT grant another turn** (unlike some variants).
5.  **Four of a Kind:** Playing 4 matching cards burns the pile.

---

## 3. ASSET & VISUAL STANDARDS

### **Visual System Lock**
- **Theme:** Green felt background, Gold/Yellow accents.
- **Changes:** Do not alter fonts, colors, or the "Felt" texture without explicit instruction.

### **SVG & Image Rules**
- **Transparency:** All assets (Avatars, Cards) must have transparent backgrounds.
- **Clean XML:** SVGs must be inspected. Remove hidden layers, masks, or stray rectangles before committing.
- **ViewBox:** Assets must be square and production-ready.

---

## 4. TECH STACK

- **Language:** TypeScript (Strict Mode)
- **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JS/TS (No heavy frameworks).
- **Transport:** Socket.IO.
- **Build/Deploy:** Vite build, Render.com deployment.
- **Tests:** Jest (`jsdom`) for client, unit tests for logic.

---

## 5. GIT & PROCESS WORKFLOW (CRITICAL)

### **Branching Strategy**
- **ALWAYS OPEN A NEW BRANCH** for every new feature or fix.
- **Naming Convention:** `type/description`
  - `feat/add-lobby-chat`
  - `fix/mobile-card-overlap`
  - `chore/cleanup-docs`
- **Never commit directly to `main`** (unless updating this Manifest).

### **The "Stop & Think" Rule**
- Before writing code, verify: "Am I in a clean branch dedicated to this specific task?"
- If you find a bug unrelated to your current task, **stash changes** and switch to a new `fix/...` branch. Do not mix unrelated changes.

### **Pre-Commit Checklist**
1.  **Mobile First:** Did I verify this on a vertical phone screen?
2.  **Contract Check:** Did I change a socket event? (Update `events.ts` and `types.ts`).
3.  **No Magic Numbers:** Use constants for delays and rules.
4.  **Architecture Check:** Did I put logic in the UI? (If yes, move it to Server).

---

## 6. INSTRUCTION TO AI

- **Role:** Senior TypeScript Engineer.
- **First Action:** Check the current branch. If on `main`, ask the user to create a new branch.
- **Scope Control:** One prompt = One goal. If a change impacts Logic AND UI, ask to split it.
- **Iteration Limit:** If a solution fails 3 times, **STOP**. Revert to the last known good state and re-assess.
- **UI Integrity:** Do not generate code that breaks existing CSS flex/grid structures.
- **Verification:** Before finalizing, ask: "Does this maintain strict type safety and preserve architecture boundaries?"

### **The "Override Protocol" (Conflict Resolution)**
If the user asks for something that violates these rules (e.g., "Make the background blue" or "Change the 10 rule"):
1.  **Do NOT blindly execute.**
2.  **Do NOT flatly refuse.**
3.  **Action:** Explicitly flag the conflict: *"This request conflicts with the [Rule Name] rule in the Manifest. Do you want to proceed with this deviation?"*
4.  **Execution:** If the user confirms, implement the change and note the deviation.

---

## 7. TYPE DEFINITIONS (SOURCE OF TRUTH)

All _new_ code should converge toward these interfaces.

/* --- Card & Deck --- */
type CardValue = string | number;

interface Card {
  value: CardValue;
  suit: string;
  back?: boolean;
  copied?: boolean;
}

/* --- Player State (Client View) --- */
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

/* --- Game State (The God Object) --- */
interface GameStateData {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckSize: number;
  currentPlayerId?: string;
  started: boolean;
  lastRealCard: Card | null;
}

/* --- Lobby --- */
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