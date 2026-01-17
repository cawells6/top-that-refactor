# PROJECT MANIFEST: "TOP THAT" (Card Game)

This document is the **Single Source of Truth** for the Top That codebase.
New code must strictly adhere to these principles.

---

## 1. CORE ARCHITECTURE

### **The "Golden Rule" of State**
- **Server (`GameController`, `GameState`)**: The absolute authority. It owns the deck, the rules, and the player stats.
- **Client (`public/`)**: A "dumb" terminal. It visualizes `STATE_UPDATE` events and sends inputs (`PLAY_CARD`). It never calculates game logic.
- **PlayerStateManager**: The new subsystem (added in Enhancement #10) that tracks connection quality, session metrics, and state checksums.

### **Layered Architecture Contracts**
Code must respect these boundaries.
1.  **Network Layer (`socketService.ts`)**: Handles generic `emit/on`. Does NOT know game rules.
2.  **Controller Layer (`GameController.ts`)**: Orchestrates the game flow. Validates moves.
3.  **Model Layer (`GameState.ts`, `Player.ts`)**: Pure data structures and logic.

### **Event Contracts (`src/shared/events.ts`)**
- `JOIN_GAME` / `JOINED`: Room entry.
- `LOBBY_STATE_UPDATE`: Real-time lobby sync (avatars, readiness).
- `START_GAME` / `GAME_STARTED`: Transition to gameplay.
- `STATE_UPDATE`: The heartbeat. Contains the *entire* relevant game state.
- `PLAY_CARD` / `CARD_PLAYED`: Gameplay actions.

---

## 2. TECH STACK & STANDARDS

- **Language:** TypeScript (Strict Mode). No `any`.
- **Styling:** `vmin` scaling for responsiveness (Mobile & Ultra-wide support).
- **Transport:** Socket.IO.
- **Assets:** SVG preferred for scalability.

---

## 3. DEVELOPMENT WORKFLOW (The Checklist)

Before merging any PR, verify:
1.  **Mobile First:** Does this UI element scale on a vertical phone screen?
2.  **Type Safety:** Are shared types (`src/shared/types.ts`) used on both Client and Server?
3.  **Contract Check:** Did I change a socket event? If so, did I update `events.ts` and the interface in `types.ts`?
4.  **No Magic Numbers:** Use constants for delays and rules.

---

## 4. TYPE DEFINITIONS (Current Model)

All data passed over the network must match these interfaces.

/* --- Game Assets --- */
type CardValue = string | number;

interface Card {
  value: CardValue;
  suit: string;
  back?: boolean;
  copied?: boolean;
}

/* --- Player Models --- */
interface PlayerSessionMetrics {
  joinedAt: Date;
  actionsPerformed: number;
  disconnectionCount: number;
  // ... other metrics defined in Player.ts
}

interface ClientStatePlayer {
  id: string;
  name: string;
  avatar?: string;
  hand?: Card[];
  upCards?: Array<Card | null>;
  downCards?: Card[];       // Hidden (back=true) for opponents
  downCount?: number;
  disconnected?: boolean;
  isComputer?: boolean;
  error?: string;
}

/* --- The God Object (Sent via STATE_UPDATE) --- */
interface GameStateData {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckSize: number;
  currentPlayerId?: string;
  started: boolean;
  lastRealCard: Card | null;
}

/* --- Lobby State --- */
interface InSessionLobbyState {
  roomId: string;
  hostId: string | null;
  players: LobbyPlayer[];
  started?: boolean;
  expectedHumanCount?: number;
  expectedCpuCount?: number;


  ## 5. GIT & PROCESS WORKFLOW

- **Branching Strategy:**
  - **Always open a new branch** for every new feature or fix.
  - **Naming Convention:** `type/description` (e.g., `feat/add-lobby-chat`, `fix/card-scaling`, `chore/cleanup-docs`).
  - **Never commit directly to `main`** (unless updating documentation like this Manifest).

- **Commit Standards:**
  - Commit messages should be descriptive (e.g., "Fix vertical overflow on ultra-wide monitors" not "fix css").

- **The "Stop & Think" Rule:**
  - Before writing code, verify: "Am I in a clean branch dedicated to this specific task?"
  - If you find yourself fixing a bug while building a feature, **stash changes** and switch to a `fix/...` branch. Do not mix unrelated changes.

- **Mobile Verification Rule:**
  - **"Phone First" Check:** Before closing any branch involving UI, you must verify it renders correctly on a vertical mobile screen (use Chrome DevTools "Device Toolbar").
}