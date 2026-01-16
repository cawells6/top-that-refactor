# Playwright Verification Script Requirements

## Overview
This document outlines the requirements and architecture for a comprehensive Playwright (TypeScript) script to verify the "Top That!" card game. The script will simulate full game sessions, including multi-player scenarios (Human vs Human, Human vs CPU), validate game rules by importing the actual game logic, and detect UI/Logic anomalies.

## Tech Stack
- **Language:** TypeScript
- **Framework:** `@playwright/test`
- **Runner:** Playwright Test Runner (`npx playwright test`)
- **Integration:** Direct import of project shared logic (`src/shared/`, `public/scripts/`)

## Architecture

### 1. Environment Management (`playwright.config.ts`)
- **Server Control:** Use Playwright's `webServer` config to launch `npm run dev:server` (or `npm start`).
- **Reuse:** Leverage existing `npm` scripts to ensure the test environment matches the dev environment.
- **Port Management:** Configure `baseURL` to point to the local server (e.g., `http://localhost:3000`).
- **Deterministic RNG:**
    - **Requirement:** The verification environment must allow passing a seed (e.g., `SEED=12345`) to the server.
    - **Implementation:** Tests should set this env var so that the server's deck shuffling is reproducible.
    - **Benefit:** Allows "replay debugging" of specific crash scenarios by forcing the exact same card deal order.

### 2. Page Object Model (POM)
The script should use a robust POM to abstract DOM interactions, typed with TypeScript interfaces.

#### `LobbyPage`
- **Actions:** `createGame()`, `joinGame(code)`, `addCpu()`, `setName()`, `startGame()`.
- **Validation:** Verify player list updates, error messages for invalid codes.

#### `GamePage`
- **Locators:**
  - **Hand:** `.hand-row .card-container` (Read `data-value` attributes).
  - **Piles:** `#center-area .pile-group`.
  - **Opponents:** `.player-area:not(.is-local)`.
- **Actions:**
  - `getHandCards()`: Returns `Card[]` (using shared types).
  - `selectCards(indices)`: Click specific cards.
  - `playCards()`: Click "#play-button".
  - `takePile()`: Click "#take-button".
  - `getLastToast()`: Read content of `.toast` messages.
- **State Inspection:**
  - **Hybrid Approach:**
    1.  **DOM Scraping:** Read `data-` attributes for visual confirmation.
    2.  **State Injection:** Use `page.evaluate(() => window.state.getLastGameState())` to access the exact client-side state for deep verification.

### 3. Logic Engine (Shared Code)
Instead of rewriting game rules, the test suite will import the "Source of Truth" directly.

- **Imports:**
  - `import { isValidPlay } from '../../src/models/GameState';` (or client equivalent)
  - `import { Card, GameStateData } from '../../src/shared/types';`
- **Validation Strategy:**
  - **Pre-Move Check:** Before the bot clicks "Play", call `isValidPlay(selectedCards, pile)`.
  - **Assertion:**
    - If `isValidPlay` returns `true`: Expect the move to succeed and the turn to advance.
    - If `isValidPlay` returns `false`: Expect the move to fail (or don't attempt it in "Smart" mode).

## Verification Phases

### Phase 1: Lobby & Connection
1.  **Host Creation:** Verify Room ID generation.
2.  **Join Flow:** Second browser context joins with Code.
3.  **CPU Addition:** Verify "Add CPU" button updates player count.
4.  **Start:** Verify transition from Lobby -> Game Table.

### Phase 2: Gameplay Loop
The script handles a turn-based loop until `GAME_OVER`:

1.  **Wait for Turn:** Poll the game state (via socket event or `window` object) until `currentPlayerId` matches the bot.
2.  **Snapshot:**
    - Get Client State: `await page.evaluate(() => window.state.getLastGameState())`
    - **Assert:** Visual DOM matches the internal state (Anomaly Detection).
3.  **Decide Move:**
    - **Smart Bot:** Import logic to find the best valid move.
    - **Random Bot (Fuzzing):** Pick random subset of hand.
4.  **Execute Move:**
    - Click cards -> Click Play.
5.  **Verify Outcome:**
    - **Valid Move:** Wait for `STATE_UPDATE` reflecting the new pile/turn.
    - **Invalid Move:** Wait for `.toast--error`.

### Phase 3: Win Detection
- Watch for `GAME_OVER` socket event.
- Watch for `.victory-overlay` DOM element.
- Verify "Play Again" button functions.

## Anomaly Detection Strategy
The script will fail if:
1.  **Console Errors:** `page.on("console", msg => ...)` logs errors.
2.  **Visual Overlap:** Check computed styles for improper element stacking.
3.  **Rule Violation:**
    - Discrepancy between `isValidPlay()` result and Server response.
    - Pile size mismatch between Client State and DOM.
4.  **Stuck Game:** No state update for > 30 seconds.

## Implementation Steps (Work Breakdown)

1.  **Setup:** `npm init playwright@latest`.
2.  **Config:** Configure `webServer` in `playwright.config.ts`.
3.  **POM:** Create `tests/pages/GamePage.ts` and `tests/pages/LobbyPage.ts`.
4.  **Bot Logic:** Create `tests/bots/SmartBot.ts` importing `src/shared`.
5.  **Test Scenarios:**
    - `tests/e2e/cpu-game.spec.ts`: 1 Human vs 3 CPUs.
    - `tests/e2e/multi-human.spec.ts`: 2 Browser Contexts playing against each other.
6.  **Reporting:** Use built-in Playwright HTML Reporter.

## Code Snippet (TypeScript Prototype)

```typescript
import { test, expect } from '@playwright/test';
import { GamePage } from '../pages/GamePage';
import { isValidPlay } from '../../src/shared/gameLogic'; // Hypothetical path

test('CPU Game Loop - Seeded', async ({ page }) => {
  // Set deterministic seed for this run
  process.env.SEED = '5555';

  const game = new GamePage(page);
  await game.goto();
  await game.startWithCpu();

  await game.waitForGameStart();

  while (!await game.isGameOver()) {
    if (await game.isMyTurn()) {
      const state = await game.getGameState();
      const hand = state.me.hand;
      const pile = state.pile;

      // Use project logic directly!
      const validMove = hand.find(card => isValidPlay([card], pile));

      if (validMove) {
        await game.playCards([validMove]);
        await expect(page.locator('.toast--error')).not.toBeVisible();
      } else {
        await game.takePile();
      }
    }
    await page.waitForTimeout(500);
  }
});
```
