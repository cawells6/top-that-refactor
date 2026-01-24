import { Page, expect } from '@playwright/test';
import { GamePage } from '../pages/GamePage';
import { waitForAnimationsToFinish } from './e2eUtils';
import { normalizeCardValue, rank } from '../../utils/cardUtils';

export async function playBestMove(gamePage: GamePage, page: Page, turnLogPrefix: string = '[Bot]') {
    // 1. Wait for stability before reading state
    await waitForAnimationsToFinish(page);

    // 2. Get State
    const state = await gamePage.getGameState();
    if (!state) return;

    // Correctly extract hand from GameStateData
    const myPlayer = state.players.find(p => p.id === state.currentPlayerId);
    const hand = myPlayer?.hand || [];
    const pile = state.pile || [];
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
    const topCardValue = topCard ? rank(topCard) : 0;

    // 3. Find Best Valid Move
    let bestValue: number | null = null;
    let bestCards: any[] = [];

    // Group cards by value to easily find multiples
    const groups = new Map<string, any[]>();
    for (const card of hand) {
        // Use normalized string key for grouping (e.g. "ten", "king")
        const key = String(normalizeCardValue(card.value));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)?.push(card);
    }

    // Strategy:
    // A. Burn (4 of a kind) - Priority
    for (const group of groups.values()) {
        if (group.length >= 4) {
            bestCards = group;
            bestValue = rank(group[0]); // Just for logging
            break;
        }
    }

    // B. Special Cards (10, 2, 5) logic
    if (bestCards.length === 0) {
        // Simple heuristic: Try to save specials, but play if needed?
        // Or play standard logic.
        // Let's iterate all groups and find the "best" one.
        // "Best" = Lowest valid rank?

        let candidateGroups: any[][] = [];

        for (const group of groups.values()) {
            const card = group[0];
            const cardRank = rank(card);
            const normVal = normalizeCardValue(card.value);

            // Is valid?
            let isValid = false;
            if (pile.length === 0) isValid = true;
            else if (normVal === 'ten' || normVal === 'two' || normVal === 'five') isValid = true;
            else if (cardRank > topCardValue) isValid = true;

            if (isValid) {
                candidateGroups.push(group);
            }
        }

        if (candidateGroups.length > 0) {
            // Sort candidates by rank (lowest first) to save high cards
            // But maybe save specials (2, 10) for last?
            // Assign weight: Standard cards = Rank. Specials = High Rank (effectively) to delay usage.
            candidateGroups.sort((a, b) => {
                const getWeight = (c: any) => {
                    const v = normalizeCardValue(c.value);
                    if (v === 'two') return 100; // Save 2s
                    if (v === 'ten') return 101; // Save 10s
                    return rank(c);
                };
                return getWeight(a[0]) - getWeight(b[0]);
            });
            bestCards = candidateGroups[0];
            bestValue = rank(bestCards[0]);
        }
    }

    // 4. Action
    if (bestCards.length > 0) {
        // Find indices of all cards in the chosen group
        // We need to map back to the original hand indices
        const indicesToSelect: number[] = [];
        const usedIndices = new Set<number>();

        for (const cardToPlay of bestCards) {
            const idx = hand.findIndex((c, i) =>
                c.value === cardToPlay.value &&
                c.suit === cardToPlay.suit &&
                !usedIndices.has(i)
            );
            if (idx !== -1) {
                indicesToSelect.push(idx);
                usedIndices.add(idx);
            }
        }

        console.log(`${turnLogPrefix} Bot playing ${bestCards.length}x ${bestCards[0].value} (Indices: ${indicesToSelect.join(',')})`);

        await gamePage.selectCards(indicesToSelect);
        await gamePage.playCards();

        // Assert Animation Start (at least one card flying)
        try {
            await expect(page.locator('.flying-card, .flying-card-ghost').first()).toBeVisible({ timeout: 2000 });
        } catch(e) {
            // Ignore if missed
        }
        await waitForAnimationsToFinish(page);
    } else {
        // Take Pile
        console.log(`${turnLogPrefix} Bot taking pile`);
        await gamePage.takePile();
        await waitForAnimationsToFinish(page);
    }
}

// Export alias to match existing tests
export const playValidMove = playBestMove;
