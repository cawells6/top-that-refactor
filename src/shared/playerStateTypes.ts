// Enhanced player state management types
export interface PlayerSessionMetrics {
  joinedAt: Date;
  lastActionAt: Date;
  actionsPerformed: number;
  averageResponseTime: number;
  disconnectionCount: number;
  totalPlayTime: number;
  cardsPlayed: number;
  pilesPickedUp: number;
  turnsPlayed: number;
  gameWins: number;
  gameLosses: number;
}

export interface PlayerConnectionState {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable';
  latency: number;
  lastPingAt: Date;
  reconnectionAttempts: number;
  connectionStability: number; // 0-1 score
  bandwidthUsage: number; // bytes per second
  packetLoss: number; // percentage
}

export interface PlayerBehaviorPattern {
  averageDecisionTime: number;
  preferredCardTypes: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  playStyle: 'defensive' | 'balanced' | 'offensive';
  adaptabilityScore: number; // 0-1 score
  learningRate: number; // for AI adaptation
}

export interface PlayerStateSnapshot {
  timestamp: Date;
  checksum: string;
  playerData: {
    id: string;
    name: string;
    hand: any[];
    upCards: any[];
    downCards: any[];
    status: string;
    disconnected: boolean;
  };
  metrics: PlayerSessionMetrics;
  connection: PlayerConnectionState;
  behavior: PlayerBehaviorPattern;
}

export interface GameStateChecksum {
  timestamp: Date;
  players: Map<string, string>; // playerId -> player checksum
  gameState: string;
  version: number;
}

export interface StateReconciliationData {
  playerId: string;
  lastKnownGoodState: PlayerStateSnapshot;
  conflictingActions: any[];
  suggestedResolution: 'rollback' | 'merge' | 'client_wins' | 'server_wins';
  confidence: number; // 0-1 confidence in resolution
}

export interface PlayerAnalyticsEvent {
  type: 'action' | 'decision' | 'connection' | 'error' | 'performance';
  playerId: string;
  timestamp: Date;
  data: any;
  duration?: number;
  context?: any;
}
