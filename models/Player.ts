// models/Player.ts
import {
  PlayerSessionMetrics,
  PlayerConnectionState,
  PlayerBehaviorPattern,
  PlayerStateSnapshot,
  PlayerAnalyticsEvent,
} from '../src/shared/playerStateTypes.js';
import { Card } from '../src/types.js';
import { rank } from '../utils/cardUtils.js';

export default class Player {
  public id: string;
  public socketId?: string;
  public hand: Card[];
  public upCards: Card[];
  public downCards: Card[];
  public name: string;
  public isComputer: boolean;
  public disconnected: boolean;
  public disconnectedAt?: Date;

  // Track the player's status in the lobby. A player can be:
  // 'host' (the room creator), 'invited' (before joining), 'joined' (connected but not ready), or 'ready' (clicked the "Let's Play" button).
  public status: 'host' | 'invited' | 'joined' | 'ready';

  // Indicates if the player is ready (for convenience in lobby logic)
  public ready: boolean;

  // 🚀 ENHANCEMENT #10: Advanced Player State Management
  public sessionMetrics: PlayerSessionMetrics;
  public connectionState: PlayerConnectionState;
  public behaviorPattern: PlayerBehaviorPattern;
  private stateSnapshots: PlayerStateSnapshot[];
  private analyticsEvents: PlayerAnalyticsEvent[];

  constructor(id: string) {
    this.id = id;
    this.hand = [];
    this.upCards = [];
    this.downCards = [];
    this.name = '';
    this.isComputer = false;
    this.disconnected = false;
    this.status = 'invited'; // Default status
    this.ready = false; // Default ready state

    // 🚀 ENHANCEMENT #10: Initialize advanced state tracking
    this.sessionMetrics = this.initializeSessionMetrics();
    this.connectionState = this.initializeConnectionState();
    this.behaviorPattern = this.initializeBehaviorPattern();
    this.stateSnapshots = [];
    this.analyticsEvents = [];
  }

  setHand(cards: Card[]): void {
    this.hand = [...cards];
    this.sortHand();
  }

  setUpCards(cards: Card[]): void {
    this.upCards = [...cards];
  }

  setDownCards(cards: Card[]): void {
    this.downCards = [...cards];
  }

  playFromHand(index: number): Card | undefined {
    const startTime = Date.now();
    if (index < 0 || index >= this.hand.length) return undefined;

    const result = this.hand.splice(index, 1)[0];
    if (result) {
      this.sessionMetrics.cardsPlayed++;
      this.recordAction('play_from_hand', Date.now() - startTime, {
        cardIndex: index,
      });
    }

    return result;
  }

  playUpCard(index: number): Card | undefined {
    if (index < 0 || index >= this.upCards.length) return undefined;
    return this.upCards.splice(index, 1)[0];
  }

  playDownCard(): Card | undefined {
    if (this.downCards.length === 0) return undefined;
    return this.downCards.shift();
  }

  pickUpPile(pile: Card[]): void {
    const startTime = Date.now();
    this.hand.push(...pile);
    this.sortHand();

    this.sessionMetrics.pilesPickedUp++;
    this.recordAction('pick_up_pile', Date.now() - startTime, {
      pileSize: pile.length,
    });
  }

  sortHand(): void {
    this.hand.sort((a, b) => rank(a) - rank(b));
  }

  hasEmptyHand(): boolean {
    return this.hand.length === 0;
  }

  hasEmptyUp(): boolean {
    return this.upCards.length === 0;
  }

  hasEmptyDown(): boolean {
    return this.downCards.length === 0;
  }

  // 🚀 ENHANCEMENT #10: Advanced Player State Management Methods

  private initializeSessionMetrics(): PlayerSessionMetrics {
    const now = new Date();
    return {
      joinedAt: now,
      lastActionAt: now,
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
  }

  private initializeConnectionState(): PlayerConnectionState {
    return {
      isConnected: true,
      connectionQuality: 'excellent',
      latency: 0,
      lastPingAt: new Date(),
      reconnectionAttempts: 0,
      connectionStability: 1.0,
      bandwidthUsage: 0,
      packetLoss: 0,
    };
  }

  private initializeBehaviorPattern(): PlayerBehaviorPattern {
    return {
      averageDecisionTime: 0,
      preferredCardTypes: [],
      riskTolerance: 'moderate',
      playStyle: 'balanced',
      adaptabilityScore: 0.5,
      learningRate: 0.1,
    };
  }

  public recordAction(
    actionType: string,
    responseTime: number,
    context?: any
  ): void {
    this.sessionMetrics.actionsPerformed++;
    this.sessionMetrics.lastActionAt = new Date();

    // Update average response time with exponential moving average
    const alpha = 0.1; // Smoothing factor
    this.sessionMetrics.averageResponseTime =
      this.sessionMetrics.averageResponseTime * (1 - alpha) +
      responseTime * alpha;

    // Update behavior pattern
    this.behaviorPattern.averageDecisionTime =
      this.behaviorPattern.averageDecisionTime * 0.9 + responseTime * 0.1;

    // Record analytics event
    this.recordAnalyticsEvent({
      type: 'action',
      playerId: this.id,
      timestamp: new Date(),
      data: { actionType, responseTime, context },
      duration: responseTime,
      context,
    });
  }

  public updateConnectionMetrics(latency: number, packetLoss: number): void {
    this.connectionState.latency = latency;
    this.connectionState.packetLoss = packetLoss;
    this.connectionState.lastPingAt = new Date();

    // Calculate connection quality
    if (latency < 50 && packetLoss < 0.01) {
      this.connectionState.connectionQuality = 'excellent';
    } else if (latency < 150 && packetLoss < 0.05) {
      this.connectionState.connectionQuality = 'good';
    } else if (latency < 300 && packetLoss < 0.1) {
      this.connectionState.connectionQuality = 'poor';
    } else {
      this.connectionState.connectionQuality = 'unstable';
    }

    // Update connection stability score
    const stabilityFactor = Math.max(0, 1 - latency / 1000 - packetLoss);
    this.connectionState.connectionStability =
      this.connectionState.connectionStability * 0.9 + stabilityFactor * 0.1;
  }

  public recordDisconnection(): void {
    this.disconnected = true;
    this.disconnectedAt = new Date();
    this.sessionMetrics.disconnectionCount++;
    this.connectionState.isConnected = false;
    this.connectionState.reconnectionAttempts = 0;

    this.recordAnalyticsEvent({
      type: 'connection',
      playerId: this.id,
      timestamp: new Date(),
      data: { event: 'disconnected' },
    });
  }

  public recordReconnection(): void {
    this.disconnected = false;
    this.disconnectedAt = undefined;
    this.connectionState.isConnected = true;
    this.connectionState.reconnectionAttempts++;

    this.recordAnalyticsEvent({
      type: 'connection',
      playerId: this.id,
      timestamp: new Date(),
      data: {
        event: 'reconnected',
        attempts: this.connectionState.reconnectionAttempts,
      },
    });
  }

  public createStateSnapshot(): PlayerStateSnapshot {
    const snapshot: PlayerStateSnapshot = {
      timestamp: new Date(),
      checksum: this.calculateStateChecksum(),
      playerData: {
        id: this.id,
        name: this.name,
        hand: [...this.hand],
        upCards: [...this.upCards],
        downCards: [...this.downCards],
        status: this.status,
        disconnected: this.disconnected,
      },
      metrics: { ...this.sessionMetrics },
      connection: { ...this.connectionState },
      behavior: { ...this.behaviorPattern },
    };

    // Keep only last 10 snapshots to prevent memory bloat
    this.stateSnapshots.push(snapshot);
    if (this.stateSnapshots.length > 10) {
      this.stateSnapshots.shift();
    }

    return snapshot;
  }

  public getLatestStateSnapshot(): PlayerStateSnapshot | null {
    return this.stateSnapshots.length > 0
      ? this.stateSnapshots[this.stateSnapshots.length - 1]
      : null;
  }

  public recordAnalyticsEvent(event: PlayerAnalyticsEvent): void {
    this.analyticsEvents.push(event);

    // Keep only last 100 events to prevent memory bloat
    if (this.analyticsEvents.length > 100) {
      this.analyticsEvents.shift();
    }
  }

  public getPlayerAnalytics(): {
    metrics: PlayerSessionMetrics;
    connection: PlayerConnectionState;
    behavior: PlayerBehaviorPattern;
    recentEvents: PlayerAnalyticsEvent[];
  } {
    return {
      metrics: { ...this.sessionMetrics },
      connection: { ...this.connectionState },
      behavior: { ...this.behaviorPattern },
      recentEvents: this.analyticsEvents.slice(-20), // Last 20 events
    };
  }

  private calculateStateChecksum(): string {
    // Simple checksum based on player state - in production, use proper hashing
    const stateString = JSON.stringify({
      id: this.id,
      hand: this.hand.length,
      upCards: this.upCards.length,
      downCards: this.downCards.length,
      status: this.status,
      disconnected: this.disconnected,
    });

    // Simple hash function - replace with crypto.createHash in production
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
