import {
  PlayerSessionMetrics,
  PlayerConnectionState,
  PlayerStateSnapshot,
} from '../src/shared/playerStateTypes.js';
import { Card } from '../src/shared/types.js';
import { rank } from '../utils/cardUtils.js';

export default class Player {
  public id: string;
  public socketId?: string;
  public hand: Card[];
  public upCards: Array<Card | null>;
  public downCards: Card[];
  public name: string;
  public avatar?: string;
  public isComputer: boolean;
  public isSpectator: boolean;
  public disconnected: boolean;
  public status: 'host' | 'invited' | 'joined' | 'ready';
  public ready: boolean;
  public sessionMetrics: PlayerSessionMetrics;
  public connectionState: PlayerConnectionState;

  constructor(id: string) {
    this.id = id;
    this.hand = [];
    this.upCards = [];
    this.downCards = [];
    this.name = '';
    this.avatar = '🤴'; // Default fallback
    this.isComputer = false;
    this.isSpectator = false;
    this.disconnected = false;
    this.status = 'invited';
    this.ready = false;
    this.sessionMetrics = {
      joinedAt: new Date(),
      lastActionAt: new Date(),
      actionsPerformed: 0,
      averageResponseTime: 0,
      disconnectionCount: 0,
      totalPlayTime: 0,
      cardsPlayed: 0,
      pilesPickedUp: 0,
      turnsPlayed: 0,
      gameWins: 0,
      gameLosses: 0,
    };
    this.connectionState = {
      isConnected: true,
      connectionQuality: 'good',
      latency: 0,
      lastPingAt: new Date(),
      reconnectionAttempts: 0,
      connectionStability: 1,
      bandwidthUsage: 0,
      packetLoss: 0,
    };
  }

  createStateSnapshot(): PlayerStateSnapshot {
    return {
      timestamp: new Date(),
      checksum: '',
      playerData: {
        id: this.id,
        name: this.name,
        hand: this.hand,
        upCards: this.upCards,
        downCards: this.downCards,
        status: this.status,
        disconnected: this.disconnected,
      },
      metrics: { ...this.sessionMetrics },
      connection: { ...this.connectionState },
      behavior: {
        averageDecisionTime: 0,
        preferredCardTypes: [],
        riskTolerance: 'moderate',
        playStyle: 'balanced',
        adaptabilityScore: 0,
        learningRate: 0,
      },
    };
  }

  updateConnectionMetrics(latency: number, packetLoss: number): void {
    this.connectionState.latency = latency;
    this.connectionState.packetLoss = packetLoss;
    this.connectionState.lastPingAt = new Date();
  }

  setHand(cards: Card[]): void {
    this.hand = [...cards];
    this.sortHand();
  }

  setUpCards(cards: Array<Card | null>): void {
    this.upCards = [...cards];
  }

  setDownCards(cards: Card[]): void {
    this.downCards = [...cards];
  }

  playFromHand(index: number): Card | undefined {
    if (index < 0 || index >= this.hand.length) return undefined;
    return this.hand.splice(index, 1)[0];
  }

  playUpCard(index: number): Card | undefined {
    if (index < 0 || index >= this.upCards.length) return undefined;
    const card = this.upCards[index];
    if (!card) return undefined;
    this.upCards[index] = null;
    return card;
  }

  playDownCard(index: number): Card | undefined {
    if (index < 0 || index >= this.downCards.length) return undefined;
    return this.downCards.splice(index, 1)[0];
  }

  pickUpPile(pile: Card[]): void {
    this.hand.push(...pile);
    this.sortHand();
  }

  sortHand(): void {
    this.hand.sort((a, b) => rank(a) - rank(b));
  }

  hasEmptyHand(): boolean {
    return this.hand.length === 0;
  }

  hasEmptyUp(): boolean {
    return this.getUpCardCount() === 0;
  }

  hasEmptyDown(): boolean {
    return this.downCards.length === 0;
  }

  getUpCardCount(): number {
    let count = 0;
    for (const card of this.upCards) {
      if (card) {
        count++;
      }
    }
    return count;
  }
}
