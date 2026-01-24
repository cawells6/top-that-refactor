import { test, expect } from '@playwright/test';
import { LobbyPage } from '../pages/LobbyPage';
import { GamePage } from '../pages/GamePage';
import { normalizeCardValue, rank, isSpecialCard, isValidPlay } from '../../utils/cardUtils';
import { waitForAnimationsToFinish } from './e2eUtils';
import type { Card } from '../../src/shared/types';

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
    while (!(await game.isGameOver())) {
        turns++;
        // Safety break
        if (turns > 500) {
            console.log('Game exceeded 500 turns - stopping');
            break;
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
            const state = await game.getGameState();
            if (!state) continue;

            const myPlayer = state.players.find(p => p.id === state.currentPlayerId);
            const hand = myPlayer?.hand || [];
            const pile = state.pile || [];

            // Group cards by value
            const groups = new Map<string, Card[]>();
            for (const card of hand) {
                const key = String(normalizeCardValue(card.value));
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)?.push(card);
            }

            // Find valid moves
            let bestMove: Card[] | null = null;

            // 1. Burn (4 of a kind)
            for (const group of groups.values()) {
                if (group.length >= 4) {
                    bestMove = group;
                    break;
                }
            }

            // 2. Special cards
            if (!bestMove) {
                for (const group of groups.values()) {
                    if (group.length > 0 && isSpecialCard(group[0].value)) {
                         if (isValidPlay(group, pile)) {
                             bestMove = group;
                             break;
                         }
                    }
                }
            }

            // 3. Lowest valid card
            if (!bestMove) {
                const validGroups: Card[][] = [];
                for (const group of groups.values()) {
                    if (isValidPlay(group, pile)) {
                        validGroups.push(group);
                    }
                }

                if (validGroups.length > 0) {
                    // Sort by rank ascending
                    validGroups.sort((a, b) => rank(a[0]) - rank(b[0]));
                    bestMove = validGroups[0];
                }
            }

            if (bestMove) {
                console.log(`[Turn ${turns}] Playing: ${bestMove.map(c => c.value).join(',')}`);
                // Select cards (using index in hand)
                const indices: number[] = [];
                const indicesUsed = new Set<number>();

                for (const cardToPlay of bestMove) {
                     // Find index in original hand that matches logic and hasn't been used
                     const idx = hand.findIndex((c, i) =>
                         c.value === cardToPlay.value &&
                         c.suit === cardToPlay.suit &&
                         !indicesUsed.has(i)
                     );

                     if (idx !== -1) {
                         indices.push(idx);
                         indicesUsed.add(idx);
                     }
                }

                await game.selectCards(indices);
                await game.playCards();

                // Assert Animation Lifecycle
                // Verify animation starts (element exists)
                await expect(page.locator('.flying-card, .flying-card-ghost').first()).toBeVisible({ timeout: 2000 });
                // Verify animation ends (element removed)
                await expect(page.locator('.flying-card, .flying-card-ghost')).toHaveCount(0);

                // Verify no error toast
                await expect(game.toast).not.toBeVisible();
            } else {
                console.log(`[Turn ${turns}] Taking pile`);
                await game.takePile();
            }

            // Wait for turn to change or state update
            await page.waitForTimeout(1000);
        }

        // Wait a bit
        await page.waitForTimeout(200);
    }

    if (await game.isGameOver()) {
        console.log('Game Over detected! Verification success.');
    }
});
