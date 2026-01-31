import GameState from '../../models/GameState';
import Player from '../../models/Player';
import { BotAction } from './types';

export interface IBotStrategy {
  calculateMove(gameState: GameState, botPlayer: Player): BotAction;
}
