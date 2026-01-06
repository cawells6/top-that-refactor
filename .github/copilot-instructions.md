# Top That! Refactor - AI Coding Agent Instructions

## Core Principle
**Accuracy over speed.** This project prioritizes holistic, well-architected solutions. Take time to understand the full context before implementing changes.

## Architecture Overview

### Layered Architecture (Never Skip Layers)
```
UI Layer (public/scripts/events.ts) → DOM events, input validation
    ↓
Application Layer (acknowledgment utils) → Business logic, retry handling
    ↓
Transport Layer (Socket.IO) → Network communication
    ↓
Server Layer (controllers/) → Game state management
```

**Critical Rule:** Never call Transport Layer directly from UI. Always go through Application Layer.

### Key Components
- **Server Entry:** `server.ts` - Express + Socket.IO server with auto-port selection (starts at 3000)
- **Game Logic:** `controllers/GameController.ts` (1700+ lines) - Room management, game flow, player state
- **State Management:** `models/GameState.ts`, `models/Player.ts` - Core domain models
- **Client:** `public/` directory served by Vite (dev) or Express (prod)
- **Shared Types:** `src/shared/events.ts` and `src/shared/types.ts` - Single source of truth for client-server contracts

### Domain Separation
- **Join vs Create:** These are distinct operations - don't mix them. Join existing games skip player count validation; Create requires 2+ total players.
- **Lobby vs Game:** Lobby state (`InSessionLobbyState`) vs Game state (`GameState`) are separate concerns.

## Development Workflow (READ THIS FIRST)

Before implementing ANY feature, follow the checklist in `docs/DEVELOPMENT_WORKFLOW.md`:
1. **Contract Definition** - Define interfaces between layers
2. **Domain Clarity** - Identify boundaries (Join vs Create, UI vs Business logic)
3. **Layer Identification** - Which layer owns this responsibility?
4. **Test Strategy** - Write failing test before implementation

**Red Flags:** If you're mocking different layers than production uses, or mixing UI/business/network concerns, STOP and reconsider.

## Critical Commands

### Development
```bash
npm run dev:all        # Start both server (port 3000) and client (port 5173) with hot reload
npm run dev:server     # Server only with nodemon
npm run dev:client     # Vite client only
./run                  # Ultra-minimal dev starter (uses run.js)
```

### Testing
```bash
npm test               # Run Jest tests (jsdom environment)
```
- Tests use `@testing-library/jest-dom` and require DOM setup
- Mock the correct abstraction layer (see `docs/LAYERED_ARCHITECTURE.md`)
- Test files: `tests/**/*.test.ts` and `public/scripts/**/*.test.ts`

### Port Management
Server auto-selects next available port if 3000 is busy (up to 30 retries). Port cleanup is handled by dev scripts.

## Project-Specific Conventions

### Event Contracts
All Socket.IO events are defined in `src/shared/events.ts` as string constants:
```typescript
export const JOIN_GAME: string = 'join-game';
export const JOINED: string = 'joined';
export const SESSION_ERROR: string = 'session-error'; // Fatal errors
export const ERROR: string = 'err'; // Non-fatal errors
```
Never hardcode event names - always import from shared events.

### Error Handling
- `session-error`: Fatal errors that clear client session and return to lobby
- `err`: Non-fatal errors that show message without state reset

### Module Resolution
- TypeScript configured with ES modules (`"type": "module"` in package.json)
- Use `.js` extensions in imports even for `.ts` files (required for ES modules)
- Path aliases: `@models/`, `@shared/`, `@publicScripts/`, `@srcTypes`
- Jest strips `.js` extensions and resolves to `.ts` (see `jest.config.cjs`)

### Lobby Layout (CSS-Driven)
**IMPORTANT:** Lobby centering/sizing is 100% CSS-driven. NO JavaScript layout manipulation.
- `public/styles/immediate-fix.css` - Prevents FOUC, ensures centered from first render
- `public/style.css` - Main modal sizing (`.lobby-modal-container`, `.game-setup-content`)
- `public/styles/modals.css` - Flex centering
- Legacy JS stabilization scripts (`position-fix.js`, `layout-stabilizer.js`) are OBSOLETE and removed

See [README.md](../README.md#lobby-layout--stabilization-maintenance-guide) for details.

## Testing Best Practices

### Environment Setup
Tests run in `jsdom` environment and require:
```typescript
document.body.innerHTML = `
  <input id="player-name" value="Test" />
  <button id="join-button"></button>
  <!-- All required DOM elements -->
`;
```

### Mocking Strategy
Mock the layer YOUR CODE actually uses:
```typescript
// ✅ Correct: If code uses emitJoinGame wrapper
jest.mock('./acknowledgmentUtils', () => ({
  emitJoinGame: jest.fn()
}))

// ❌ Wrong: Mocking socket.emit when code uses emitJoinGame
jest.mock('./socket', () => ({ emit: jest.fn() }))
```

### Validation Testing
Client and server validation MUST agree. Test contract compliance:
```typescript
expect(clientValidation(payload)).toEqual(serverValidation(payload))
```

## File Organization

### Server-Side
- `server.ts` - HTTP server + Socket.IO initialization
- `controllers/GameController.ts` - Main game room manager, handles all Socket.IO events
- `controllers/PlayerStateManager.ts` - Player state synchronization
- `models/` - Domain models (GameState, Player)
- `utils/` - Pure functions (CardLogic, cardUtils)

### Client-Side
- `public/index.html` - Entry point (uses `.preload`/`.loaded` classes for FOUC prevention)
- `public/scripts/main.ts` - Client initialization
- `public/scripts/events.ts` - UI event handlers (top of layer hierarchy)
- `public/scripts/render.ts` - DOM rendering
- `public/styles/` - All styling (modular CSS files)

### Shared
- `src/shared/events.ts` - Socket.IO event names (single source of truth)
- `src/shared/types.ts` - TypeScript interfaces for client-server payloads

### Documentation
Start with `docs/DEVELOPMENT_WORKFLOW.md` for any feature work. Reference:
- `docs/ARCHITECTURE_SUMMARY.md` - Why current architecture exists
- `docs/LAYERED_ARCHITECTURE.md` - Layer responsibilities and testing
- `docs/ARCHITECTURE_CONTRACTS.md` - Contract-first development examples

## Common Pitfalls to Avoid

1. **Layer Violation:** Calling `socket.emit` directly from UI code instead of using Application Layer
2. **Domain Mixing:** Combining Join and Create logic in same function
3. **Test Misalignment:** Mocking Transport Layer when code uses Application Layer
4. **Validation Duplication:** Different validation rules on client vs server
5. **Hardcoded Events:** Using string literals instead of importing from `src/shared/events.ts`
6. **Extension Confusion:** Importing `.ts` files with `.ts` extension (use `.js` for ES modules)
7. **Card Image Loading:** Cards load from external `deckofcardsapi.com` API - always include error handlers and fallbacks. Card backs use custom CSS with logo from `/assets/` (URL-encode spaces: `logo%20and%20slogan.svg`)
8. **Asset Path Hardcoding:** Never hardcode asset paths like `/assets/file.svg` - always import them so Vite can hash filenames in production builds

## Port Configuration
- **Server:** Port 3000 (auto-increments if unavailable, logged at startup)
- **Vite Client:** Port 5173 (proxies `/socket.io` to server)
- Socket.IO connections automatically routed through Vite proxy in dev mode

## Vite Configuration & Client-Server Communication

### Development Mode (Vite Dev Server)
- Vite serves from `public/` directory as root
- Socket.IO proxy: `/socket.io` → `ws://localhost:3000` (WebSocket protocol)
- Static `/src` directory is also served for shared modules
- HMR (Hot Module Reload) enabled on port 5173

### Production Mode
- Static files served from `dist/client/` by Express
- Direct Socket.IO connection (no proxy)
- Build output from `public/index.html` and `public/card-test.html` entry points
- **Asset Hashing:** Vite hashes filenames in production (e.g., `logo and slogan.svg` → `logo and slogan-N7m85ZYJ.svg`)
  - **CRITICAL:** Always import assets instead of hardcoding paths: `import logoUrl from '../assets/logo.svg'`
  - Use imported variable in code: `img.src = logoUrl` not `img.src = '/assets/logo.svg'`
  - **Pattern Check:** Look for existing asset imports in the file (e.g., `playerAvatarUrl`, `robotAvatarUrl`) - follow the same pattern for ANY new assets

### Key Vite Settings
```typescript
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/socket.io': {
      target: 'ws://localhost:3000',
      ws: true,  // Enable WebSocket proxying
      changeOrigin: true
    },
    '/cards-api': {  // Fallback for Deck of Cards API
      target: 'https://deckofcardsapi.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/cards-api/, '')
    }
  }
}
```

## Build & Production
```bash
npm run build         # TypeScript compilation + Vite build
npm run build:client  # Vite build only
npm start             # Run from dist/ (production)
```
Production serves built client from `dist/client/`, development serves from `public/`.

## Game Logic Patterns

### Special Card Mechanics (`utils/CardLogic.ts`)
The game implements special card rules that override normal play:

```typescript
// Card 2: Resets pile (any card can be played next)
if (isTwoCard(value)) {
  emit(SPECIAL_CARD_EFFECT, { type: 'two', value })
}

// Card 10 or Four-of-a-Kind: Burns/clears pile
if (isTenCard(value) || fourOfKindPlayed) {
  emit(SPECIAL_CARD_EFFECT, { type: 'ten'/'four', value })
  gameState.clearPile({ toDiscard: false })
}

// Card 5: Copies last real card played
if (isFiveCard(value)) {
  emit(SPECIAL_CARD_EFFECT, { type: 'five', value })
  gameState.addToPile({ ...gameState.lastRealCard, copied: true })
}
```

**Key Concepts:**
- `normalizeCardValue()`: Converts face cards (J, Q, K) to numeric values for comparisons
- `isSpecialCard()`: Checks if card requires special handling
- Special cards can chain (e.g., 5 copying a 10 burns the pile)
- `lastRealCard`: Tracks last non-special card for 5's copy effect

### CPU/Bot Player Architecture

#### Bot Creation & Naming
```typescript
// CPU_NAMES pool in GameController.ts
const CPU_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', ...]

// Bots created when game starts with numCPUs > 0
player.isComputer = true  // Flag for bot players
player.name = getRandomCpuName(usedNames)  // Unique CPU name
```

#### Bot Turn Execution
- **Scheduled Turns:** `scheduleComputerTurn(player, cpuTurnDelayMs)` - 2s delay for realism
- **Turn Logic:** `playComputerTurn(player)` - Executes bot decision-making
- **Best Play Selection:** `findBestPlayForComputer(player, zone)` - AI card selection

**Bot Strategy:**
1. **Hand Phase:** Find best playable card(s), or pick up pile if no valid play
2. **Up Cards Phase:** Single card plays only (visible to all players)
3. **Down Cards Phase:** Random selection (blind play)

**Key Implementation Details:**
- Bots tracked in `pendingComputerTurns` Set to prevent duplicate execution
- `cpuTurnDelayMs` (2s) and `cpuSpecialDelayMs` (3s) simulate human thinking
- Bots skip player state sync (no Socket.IO connection)
- `isProcessingTurn` flag prevents overlapping turns

### Player State Synchronization (`PlayerStateManager.ts`)

#### Connection Monitoring (Human Players Only)
```typescript
registerPlayer(player)  // Starts monitoring
  → startConnectionMonitoring() // 5s ping intervals
  → pingPlayer() // Measures latency, packet loss
  → player.updateConnectionMetrics(latency, packetLoss)
```

#### State Checksum & Validation
```typescript
// Create checksum snapshot
const checksum = manager.createGameStateChecksum(gameStateData)
// checksum.players: Map<playerId, playerChecksum>
// checksum.gameState: Hash of entire game state
// checksum.version: Incremental version number

// Validate client state matches server
manager.validatePlayerState(playerId, clientChecksum) → boolean
```

#### Session Metrics Tracking
Each player tracks detailed analytics:
- `sessionMetrics.actionsPerformed`: Total actions (cards played, piles picked up)
- `sessionMetrics.averageResponseTime`: Average time to complete turn
- `sessionMetrics.cardsPlayed`, `pilesPickedUp`, `turnsPlayed`: Game statistics
- `connectionState.connectionQuality`: 'good' | 'fair' | 'poor' based on latency/packet loss

**Key Features:**
- Last 50 checksums retained for history (prevents memory bloat)
- Bots excluded from connection monitoring (`!player.isComputer`)
- Analytics aggregation: `collectPlayerAnalytics()` provides system health overview
- Reconnection queues: `reconnectionQueues` stores pending state updates for disconnected players

---

**When in doubt:** Check existing patterns in the codebase, follow the development workflow checklist, and prioritize clarity over cleverness.
