# Playwright Verification System

## Overview
This document describes the automated verification architecture for "Top That!". The system uses Playwright to simulate full game sessions (Human vs CPU), verifying game rules by importing the actual game logic and detecting UI/Logic anomalies.

## Tech Stack
- **Framework:** `@playwright/test`
- **Runner:** `npx playwright test`
- **Integration:** Direct import of project shared logic (`src/shared/`, `utils/cardUtils`)
- **State Access:** Hybrid (DOM scraping + Direct Window State Injection)

## Core Architecture

### 1. Environment Management (`playwright.config.ts`)
- **Server Control:** Automatically launches `npm run dev:all:clean` before tests.
- **Port:** Tests run against `http://localhost:5173`.
- **Deterministic RNG:**
    - The config sets `SEED=12345` in the environment.
    - This forces the server to deal cards in a predictable order, allowing for "replay debugging" of specific crash scenarios.

### 2. Page Object Models (POM)
Interactions are abstracted into typed classes in `tests/pages/`.

#### `LobbyPage`
- **Responsibilities:** Joining games, setting names, adding CPUs, starting the game.
- **Key Method:** `joinGame(code)` - Handles the invite code flow.

#### `GamePage`
- **Responsibilities:** Gameplay actions (Play, Take), Hand validation.
- **Hybrid State Inspection:**
  - Instead of guessing state from pixels, we inject code into the browser:
  - `window.state.getLastGameState()` returns the *exact* client-side data model.
  - This allows us to assert that the UI matches the internal data 1:1.

### 3. Logic Engine
The test suite imports the "Source of Truth" directly to verify moves.
- **File:** `tests/e2e/full-game.spec.ts`
- **Logic:** It groups cards, checks for 4-of-a-kind, handles special cards (Burn/Reset), and validates moves using `isValidPlay()` from the actual game code.

## Current Test Scenarios

### ✅ Full Game: Human vs CPU
**File:** `tests/e2e/full-game.spec.ts`
1.  **Setup:** Creates a host, adds 1 CPU, starts game.
2.  **Game Loop:**
    - Waits for "My Turn".
    - Analyzes Hand using `cardUtils`.
    - **Strategy:** Prioritizes 4-of-a-kind -> Special Cards -> Lowest Valid Card.
    - executes the move via UI clicks.
    - **Validation:** Ensures no error toasts appear after a move.
3.  **Termination:** Runs until `GAME_OVER` or a 500-turn safety limit.

## Remaining Roadmap / Backlog

### Phase 2: Multi-Human Testing
- [ ] **Objective:** Verify synchronization between two real players.
- [ ] **Method:** Use Playwright "Browser Contexts" to open two separate windows in the same test file.
- [ ] **Validation:** Verify that Player A's move updates Player B's screen immediately.

### Phase 3: Deep Anomaly Detection
- [ ] **Visual Overlap:** Add automated checks for elements that shouldn't overlap (e.g., Hand covering the Pile).
- [ ] **Console Monitoring:** Fail the test if specific "Critical" errors appear in the browser console.

## How to Run
```bash
# Run all tests (headless)
npx playwright test

# Run with UI (to watch the bot play)
npx playwright test --ui

# Debug a specific test
npx playwright test full-game --debug