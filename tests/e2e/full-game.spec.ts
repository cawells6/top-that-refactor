import { test, expect } from '@playwright/test';
import { LobbyPage } from '../pages/LobbyPage';
import { GamePage } from '../pages/GamePage';
import { waitForAnimationsToFinish } from './e2eUtils';
import { playValidMove } from './botBehavior';

test('Full Game - Human vs CPU', async ({ page }) => {
    // Listen for console logs
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

    test.setTimeout(300000); // 5 minutes max

    const lobby = new LobbyPage(page);
    const game = new GamePage(page);

    await lobby.goto();
    await lobby.setName('PlaywrightBot');
    await lobby.addCpu(); // Add 1 CPU
    await lobby.startGame();

    await game.waitForGameStart();

    // Ensure animations/overlay are handled before snapshot
    await waitForAnimationsToFinish(page);

    // Initial game state snapshot
    await expect(page).toHaveScreenshot('game-start.png', {
        mask: [page.locator('.game-log-time'), page.locator('.game-log-entry')]
    });

    let turns = 0;
    let lastPlayerId = '';
    let stuckTurns = 0;

    while (!(await game.isGameOver())) {
        turns++;
        // Safety break
        if (turns > 500) {
            console.log('Game exceeded 500 turns - stopping');
            break;
        }

        const state = await game.getGameState();
        const currentPlayerId = state?.currentPlayerId || '';
        if (currentPlayerId && currentPlayerId === lastPlayerId) {
            stuckTurns++;
            if (stuckTurns >= 30) {
                throw new Error(`Game stuck on player ${currentPlayerId} for 30 loop iterations (approx 6s)!`);
            }
        } else {
            stuckTurns = 0;
            lastPlayerId = currentPlayerId;
        }

        // Clean Up the Loop: Ensure animations finish before interacting
        await waitForAnimationsToFinish(page);

        // Visual Snapshots for first few turns
        if (turns <= 2) {
             await expect(page).toHaveScreenshot(`turn-${turns}-end.png`, {
                mask: [page.locator('.game-log-time'), page.locator('.game-log-entry')]
            });
        }

        if (await game.isMyTurn()) {
            await playValidMove(game, page, `[Turn ${turns}]`);
            // Wait for turn to change or state update
            await page.waitForTimeout(1000);
        }

        // Wait a bit
        await page.waitForTimeout(200);
    }

    if (await game.isGameOver()) {
        console.log('Game Over detected! Verification success.');
        await expect(page.locator('.victory-overlay')).toBeVisible();
        await expect(page.locator('.victory-winner')).not.toBeEmpty();
    }
});
