// Enhanced Player State Manager for advanced synchronization and analytics
import Player from '../models/Player.js';
import {
  PlayerSessionMetrics,
  PlayerAnalyticsEvent,
  GameStateChecksum,
  StateReconciliationData,
} from '../src/shared/playerStateTypes.js';

export class PlayerStateManager {
  private players: Map<string, Player>;
  private gameStateChecksums: GameStateChecksum[];
  private reconnectionQueues: Map<string, StateReconciliationData[]>;
  private analyticsBuffer: PlayerAnalyticsEvent[];
  private pingIntervals: Map<string, NodeJS.Timeout>;

  constructor() {
    this.players = new Map();
    this.gameStateChecksums = [];
    this.reconnectionQueues = new Map();
    this.analyticsBuffer = [];
    this.pingIntervals = new Map();
  }

  public registerPlayer(player: Player): void {
    this.players.set(player.id, player);
    this.reconnectionQueues.set(player.id, []);

    // Start connection monitoring for human players
    if (!player.isComputer) {
      this.startConnectionMonitoring(player);
    }
  }

  public unregisterPlayer(playerId: string): void {
    this.players.delete(playerId);
    this.reconnectionQueues.delete(playerId);
    this.stopConnectionMonitoring(playerId);
  }

  private startConnectionMonitoring(player: Player): void {
    if (this.pingIntervals.has(player.id)) {
      this.stopConnectionMonitoring(player.id);
    }

    const interval = setInterval(() => {
      this.pingPlayer(player);
    }, 5000); // Ping every 5 seconds

    this.pingIntervals.set(player.id, interval);
  }

  private stopConnectionMonitoring(playerId: string): void {
    const interval = this.pingIntervals.get(playerId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(playerId);
    }
  }

  private async pingPlayer(player: Player): Promise<void> {
    if (!player.socketId || player.disconnected) return;

    // In a real implementation, you'd send a ping to the socket and measure response
    // For now, we'll simulate network conditions
    const simulatedLatency = Math.random() * 100 + 20; // 20-120ms
    const simulatedPacketLoss = Math.random() * 0.02; // 0-2% packet loss

    player.updateConnectionMetrics(simulatedLatency, simulatedPacketLoss);
  }

  public createGameStateChecksum(gameStateData: any): GameStateChecksum {
    const playerChecksums = new Map<string, string>();

    for (const [playerId, player] of this.players) {
      const snapshot = player.createStateSnapshot();
      playerChecksums.set(playerId, snapshot.checksum);
    }

    const checksum: GameStateChecksum = {
      timestamp: new Date(),
      players: playerChecksums,
      gameState: this.calculateGameStateHash(gameStateData),
      version: this.gameStateChecksums.length + 1,
    };

    this.gameStateChecksums.push(checksum);

    // Keep only last 50 checksums to prevent memory bloat
    if (this.gameStateChecksums.length > 50) {
      this.gameStateChecksums.shift();
    }

    return checksum;
  }

  private calculateGameStateHash(gameStateData: any): string {
    // Simple hash function for game state - use proper crypto hashing in production
    const stateString = JSON.stringify(gameStateData);
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  public validatePlayerState(
    playerId: string,
    clientChecksum: string
  ): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const serverSnapshot = player.createStateSnapshot();
    return serverSnapshot.checksum === clientChecksum;
  }

  public collectPlayerAnalytics(): {
    totalPlayers: number;
    averageSessionTime: number;
    connectionQualityDistribution: Record<string, number>;
    topPerformingPlayers: Array<{
      id: string;
      name: string;
      metrics: PlayerSessionMetrics;
    }>;
    systemHealth: {
      averageLatency: number;
      packetLossRate: number;
      disconnectionRate: number;
    };
  } {
    const players = Array.from(this.players.values());
    const humanPlayers = players.filter((p) => !p.isComputer);

    const totalPlayers = humanPlayers.length;
    const now = Date.now();

    const averageSessionTime =
      humanPlayers.reduce((sum, player) => {
        const sessionTime = now - player.sessionMetrics.joinedAt.getTime();
        return sum + sessionTime;
      }, 0) / Math.max(totalPlayers, 1);

    const connectionQualityDistribution = humanPlayers.reduce(
      (dist, player) => {
        const quality = player.connectionState.connectionQuality;
        dist[quality] = (dist[quality] || 0) + 1;
        return dist;
      },
      {} as Record<string, number>
    );

    const topPerformingPlayers = humanPlayers
      .sort(
        (a, b) =>
          b.sessionMetrics.actionsPerformed - a.sessionMetrics.actionsPerformed
      )
      .slice(0, 3)
      .map((player) => ({
        id: player.id,
        name: player.name,
        metrics: player.sessionMetrics,
      }));

    const systemHealth = {
      averageLatency:
        humanPlayers.reduce((sum, p) => sum + p.connectionState.latency, 0) /
        Math.max(totalPlayers, 1),
      packetLossRate:
        humanPlayers.reduce((sum, p) => sum + p.connectionState.packetLoss, 0) /
        Math.max(totalPlayers, 1),
      disconnectionRate:
        humanPlayers.reduce(
          (sum, p) => sum + p.sessionMetrics.disconnectionCount,
          0
        ) / Math.max(totalPlayers, 1),
    };

    return {
      totalPlayers,
      averageSessionTime,
      connectionQualityDistribution,
      topPerformingPlayers,
      systemHealth,
    };
  }

  public cleanup(): void {
    // Clear all intervals
    for (const [playerId] of this.pingIntervals) {
      this.stopConnectionMonitoring(playerId);
    }

    // Clear data structures
    this.players.clear();
    this.gameStateChecksums = [];
    this.reconnectionQueues.clear();
    this.analyticsBuffer = [];
  }
}

export default PlayerStateManager;
