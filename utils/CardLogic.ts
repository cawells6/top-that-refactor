import { Server } from 'socket.io';
import GameState from '../models/GameState.js';
import Player from '../models/Player.js';
import { Card } from '../src/shared/types.js';
import { SPECIAL_CARD_EFFECT } from '../src/shared/events.ts';
import {
  normalizeCardValue,
  isSpecialCard,
  isTwoCard,
  isFiveCard,
  isTenCard,
} from './cardUtils.js';

export function handleSpecialCard(
  io: Server,
  gameState: GameState,
  player: Player,
  playedCards: Card[],
  roomId: string,
  options: { fourOfKindPlayed?: boolean } = {}
): { pileClearedBySpecial: boolean } {
  const lastPlayedCard = playedCards[0];
  const lastPlayedNormalizedValue = normalizeCardValue(lastPlayedCard.value);
  let pileClearedBySpecial = false;
  const fourOfKindPlayed = options.fourOfKindPlayed === true;

  if (isTwoCard(lastPlayedNormalizedValue)) {
    console.log(`Special card: 2 played by ${player.id}. Resetting pile.`);
    io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
      type: 'two',
      value: lastPlayedNormalizedValue,
    });
  } else if (fourOfKindPlayed || isTenCard(lastPlayedNormalizedValue)) {
    const effectType = isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four';
    console.log(
      `Special card: ${effectType} played by ${player.id}. Burning pile.`
    );
    io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
      type: effectType,
      value: lastPlayedNormalizedValue,
    });
    gameState.clearPile({ toDiscard: false });
    pileClearedBySpecial = true;
  } else if (isFiveCard(lastPlayedNormalizedValue)) {
    console.log(
      `Special card: 5 played by ${player.id}. Copying last real card.`
    );
    io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
      type: 'five',
      value: lastPlayedNormalizedValue,
    });
    if (gameState.lastRealCard) {
      const copiedCard: Card = {
        ...gameState.lastRealCard,
        copied: true,
      };
      gameState.addToPile(copiedCard);
      const copiedNormalizedValue = normalizeCardValue(copiedCard.value);
      if (isTwoCard(copiedNormalizedValue)) {
        io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
          type: 'two',
          value: copiedNormalizedValue,
        });
      } else if (isTenCard(copiedNormalizedValue)) {
        io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
          type: 'ten',
          value: copiedNormalizedValue,
        });
        gameState.clearPile({ toDiscard: false });
        pileClearedBySpecial = true;
      }
    }
  }

  return { pileClearedBySpecial };
}
