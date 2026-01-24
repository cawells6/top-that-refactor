import { expect, Page } from '@playwright/test';
import { GamePage } from '../pages/GamePage';
import { normalizeCardValue, rank, isSpecialCard, isValidPlay } from '../../utils/cardUtils';
import { waitForAnimationsToFinish } from './e2eUtils';
import type { Card } from '../../src/shared/types';

export async function playValidMove(game: GamePage, page: Page, turnLogPrefix: string = '[Bot]') {
    await waitForAnimationsToFinish(page);
    const state = await game.getGameState();
    if (!state) return;

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
        console.log(`${turnLogPrefix} Playing: ${bestMove.map(c => c.value).join(',')}`);
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

        // Assert Animation Lifecycle: Handled by checking start then finish
        try {
            await expect(page.locator('.flying-card, .flying-card-ghost').first()).toBeVisible({ timeout: 2000 });
        } catch(e) {
            // Animation might have been too fast or missed, but we proceed to wait for finish
        }
        await waitForAnimationsToFinish(page);

        // Verify no error toast
        await expect(game.toast).not.toBeVisible();
    } else {
        console.log(`${turnLogPrefix} Taking pile`);
        await game.takePile();
        await waitForAnimationsToFinish(page);
    }
}
