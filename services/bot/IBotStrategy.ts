import GameState from '../../models/GameState.js';
import Player from '../../models/Player.js';
import { BotAction } from './types.js';

export interface IBotStrategy {
  calculateMove(gameState: GameState, botPlayer: Player): BotAction;
}
