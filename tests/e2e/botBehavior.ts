import { Page, expect } from '@playwright/test';
import { GamePage } from '../pages/GamePage';
import { waitForAnimationsToFinish } from './e2eUtils';
import { normalizeCardValue, rank, isValidPlay } from '../../utils/cardUtils';

export async function playBestMove(gamePage: GamePage, page: Page, turnLogPrefix: string = '[Bot]') {
    // 1. Wait for stability before reading state
    await waitForAnimationsToFinish(page);

    // 2. Get State
    const state = await gamePage.getGameState();
    if (!state) return;

    // Correctly extract hand from GameStateData
    const myPlayer = state.players.find(p => p.id === state.currentPlayerId);
    const hand = myPlayer?.hand || [];
    const upCards = myPlayer?.upCards || [];
    const downCards = myPlayer?.downCards || [];
    const pile = state.pile || [];
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
    const topCardValue = topCard ? rank(topCard) : 0;

    // Check phases
    const hasHand = hand.length > 0;
    const hasUp = !hasHand && upCards.some(c => c !== null);
    const hasDown = !hasHand && !hasUp && downCards.length > 0;

    let bestCards: any[] = [];
    let actionZone: 'hand' | 'up' | 'down' = 'hand';
    let indicesToSelect: number[] = [];

    if (hasHand) {
        actionZone = 'hand';
        // Group cards by value to easily find multiples
        const groups = new Map<string, any[]>();
        for (const card of hand) {
            const key = String(normalizeCardValue(card.value));
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)?.push(card);
        }

        // Strategy: A. Burn (4 of a kind) - Priority
        for (const group of groups.values()) {
            if (group.length >= 4) {
                bestCards = group;
                break;
            }
        }

        // B. Special Cards (10, 2, 5) logic
        if (bestCards.length === 0) {
            let candidateGroups: any[][] = [];
            for (const group of groups.values()) {
                if (isValidPlay(group, pile)) {
                    candidateGroups.push(group);
                }
            }

            if (candidateGroups.length > 0) {
                // Sort candidates by rank (lowest first)
                candidateGroups.sort((a, b) => {
                    const getWeight = (c: any) => {
                        const v = normalizeCardValue(c.value);
                        if (v === 'two') return 100;
                        if (v === 'ten') return 101;
                        return rank(c);
                    };
                    return getWeight(a[0]) - getWeight(b[0]);
                });
                bestCards = candidateGroups[0];
            }
        }

        if (bestCards.length > 0) {
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
        }
    } else if (hasUp) {
        actionZone = 'up';
        // Check Up Cards
        // Up cards are played one at a time usually, unless multiples?
        // UI supports selecting multiple? The rules say "Multiples...".
        // But render.ts isValidPlay check in `hasValidUpPlay` uses single card check.
        // `GameController.ts`: `if ((zone === 'upCards' || zone === 'downCards') && cardIndices.length !== 1)`
        // Wait, GameController enforces single card for Up/Down?
        // "Can only play one card from this stack."
        // So we scan for a valid up card.

        for (let i = 0; i < upCards.length; i++) {
            const c = upCards[i];
            if (c && isValidPlay([c], pile)) {
                bestCards = [c];
                indicesToSelect = [i];
                break;
            }
        }
    } else if (hasDown) {
        actionZone = 'down';
        // Blind play. Pick first available.
        bestCards = [downCards[0]];
        indicesToSelect = [0];
    }

    // 4. Action
    if (bestCards.length > 0) {
        console.log(`${turnLogPrefix} Bot playing [${actionZone}] ${bestCards.length}x ${bestCards[0].value || '?'} (Indices: ${indicesToSelect.join(',')})`);

        if (actionZone === 'hand') {
            await gamePage.selectCards(indicesToSelect);
            await gamePage.playCards();
        } else if (actionZone === 'up') {
            await gamePage.selectUpCard(indicesToSelect[0]);
            await gamePage.playCards();
        } else if (actionZone === 'down') {
            await gamePage.selectDownCard(indicesToSelect[0]);
            // For down cards, clicking it might auto-play or just reveal?
            // GameController expects PLAY_CARD event.
            // UI: Click down card -> toggles selection? Or if single click triggers?
            // In render.ts, down cards have `selectable` class if `canPlayDown`.
            // If we select it, we still need to click Play?
            // Usually standard UI requires selection + Play button.
            await gamePage.playCards();
        }

        // Assert Animation
        try {
            await expect(page.locator('.flying-card, .flying-card-ghost').first()).toBeVisible({ timeout: 2000 });
        } catch(e) {
            // Ignore
        }
        await waitForAnimationsToFinish(page);

    } else {
        // No valid play
        // If hasHand or hasUp, we must Take Pile.
        // If hasDown, we MUST play a down card?
        // Wait, if we are in Down phase, we pick a card. If it fails, server forces pickup.
        // But `hasDown` logic above picks a card blindly. So `bestCards` is NOT empty in Down phase.
        // So we only reach here if (hasHand or hasUp) AND no valid cards.
        console.log(`${turnLogPrefix} Bot taking pile`);
        await gamePage.takePile();
        await waitForAnimationsToFinish(page);
    }
}

// Export alias to match existing tests
export const playValidMove = playBestMove;
