import { IBotStrategy } from './IBotStrategy';
import { BotAction, BotPlayCardsAction, BotPickupAction } from './types';
import GameState from '../../models/GameState';
import Player from '../../models/Player';
import { Card } from '../../src/shared/types';
import { normalizeCardValue } from '../../utils/cardUtils';

export class DefaultBotStrategy implements IBotStrategy {
  public calculateMove(gameState: GameState, botPlayer: Player): BotAction {
    const requiredZone =
      botPlayer.hand.length > 0
        ? 'hand'
        : botPlayer.getUpCardCount() > 0
        ? 'upCards'
        : botPlayer.downCards.length > 0
        ? 'downCards'
        : null;

    if (!requiredZone) {
      // This should not happen if the game is still running
      // but as a fallback, we'll do nothing.
      // A better implementation might be to log this error.
      return { action: 'PICKUP' };
    }

    if (requiredZone === 'hand') {
      const bestPlay = this.findBestPlay(gameState, botPlayer, 'hand');
      if (bestPlay) {
        return {
          action: 'PLAY',
          ...bestPlay,
        };
      }
      return { action: 'PICKUP' };
    }

    if (requiredZone === 'upCards') {
      const bestPlay = this.findBestPlay(gameState, botPlayer, 'upCards', {
        singleCardOnly: true,
      });
      if (bestPlay) {
        return {
          action: 'PLAY',
          ...bestPlay,
        };
      }
      return { action: 'PICKUP' };
    }

    // requiredZone === 'downCards'
    const downIndex = Math.floor(Math.random() * botPlayer.downCards.length);
    const downCardToPlay = botPlayer.downCards[downIndex];
    if (downCardToPlay) {
      return {
        action: 'PLAY',
        cards: [downCardToPlay],
        indices: [downIndex],
        zone: 'downCards',
      };
    }

    // Should be unreachable
    return { action: 'PICKUP' };
  }

  private findBestPlay(
    gameState: GameState,
    player: Player,
    zone: 'hand' | 'upCards',
    options: { singleCardOnly?: boolean } = {}
  ): { cards: Card[]; indices: number[]; zone: 'hand' | 'upCards' } | null {
    const cardsInZone = zone === 'hand' ? player.hand : player.upCards;
    let hasPlayableCard = false;
    if (zone === 'hand') {
      hasPlayableCard = cardsInZone.length > 0;
    } else {
      hasPlayableCard = cardsInZone.some((card) => Boolean(card));
    }
    if (!hasPlayableCard) return null;

    const optionsList: {
      cards: Card[];
      indices: number[];
      zone: 'hand' | 'upCards';
    }[] = [];

    if (!options.singleCardOnly) {
      const grouped = new Map<string, { cards: Card[]; indices: number[] }>();
      for (let i = 0; i < cardsInZone.length; i++) {
        const card = cardsInZone[i] as Card | null;
        if (!card) {
          continue;
        }
        const key = String(normalizeCardValue(card.value) ?? card.value);
        const existing = grouped.get(key);
        if (existing) {
          existing.cards.push(card);
          existing.indices.push(i);
        } else {
          grouped.set(key, { cards: [card], indices: [i] });
        }
      }

      for (const group of grouped.values()) {
        if (group.cards.length > 1 && gameState.isValidPlay(group.cards)) {
          optionsList.push({
            cards: group.cards,
            indices: group.indices,
            zone,
          });
        }
      }
    }

    for (let i = 0; i < cardsInZone.length; i++) {
      const card = cardsInZone[i] as Card | null;
      if (!card) {
        continue;
      }
      if (gameState.isValidPlay([card])) {
        optionsList.push({ cards: [card], indices: [i], zone });
      }
    }

    if (optionsList.length === 0) {
      return null;
    }

    const choiceIndex = Math.floor(Math.random() * optionsList.length);
    return optionsList[choiceIndex];
  }
}
