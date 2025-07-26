// Enhanced connection manager with automatic reconnection and state tracking

import { Socket } from 'socket.io-client';

import {
  ConnectionStatus,
  ConnectionState,
  ReconnectionConfig,
  ConnectionMetrics,
} from './types/connectionTypes.js';

export class ConnectionManager {
  private socket: Socket | null = null;
  private state: ConnectionState;
  private config: ReconnectionConfig;
  private metrics: ConnectionMetrics;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private pingIntervalId: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((payload: any) => void)[]> = new Map();
  private lastPingTime: number = 0;
  private sessionStartTime: number = Date.now();

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      enableAutoReconnect: true,
      ...config,
    };

    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxAttempts,
      reconnectDelay: this.config.initialDelay,
      maxReconnectDelay: this.config.maxDelay,
      isAutoReconnectEnabled: this.config.enableAutoReconnect,
      connectionQuality: 'unknown',
    };

    this.metrics = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnectAttempts: 0,
      successfulReconnects: 0,
      connectionUptime: 0,
    };
  }

  public setSocket(socket: Socket): void {
    if (this.socket) {
      this.cleanupSocketListeners();
    }

    this.socket = socket;
    this.setupSocketListeners();
    this.updateStatus('connecting');
  }

  public getState(): Readonly<ConnectionState> {
    return { ...this.state };
  }

  public getMetrics(): Readonly<ConnectionMetrics> {
    const currentUptime =
      this.state.status === 'connected'
        ? Date.now() - this.sessionStartTime
        : this.metrics.connectionUptime;

    return {
      ...this.metrics,
      connectionUptime: currentUptime,
    };
  }

  public forceReconnect(): void {
    console.log('[ConnectionManager] Force reconnect triggered');
    this.state.reconnectAttempts = 0;
    this.state.reconnectDelay = this.config.initialDelay;
    this.attemptReconnection();
  }

  public stopReconnection(): void {
    console.log('[ConnectionManager] Stopping reconnection attempts');
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.state.isAutoReconnectEnabled = false;
  }

  public enableAutoReconnect(): void {
    this.state.isAutoReconnectEnabled = true;
    this.config.enableAutoReconnect = true;
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[ConnectionManager] Socket connected');
      this.handleConnect();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[ConnectionManager] Socket disconnected:', reason);
      this.handleDisconnect(reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.log('[ConnectionManager] Connection error:', error.message);
      this.handleConnectionError(error);
    });

    this.socket.on('pong', () => {
      this.handlePong();
    });

    this.startPingMonitoring();
  }

  private cleanupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.off('connect');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    this.socket.off('pong');

    this.stopPingMonitoring();
  }

  private handleConnect(): void {
    const wasReconnecting = this.state.status === 'reconnecting';
    const reconnectAttempts = this.state.reconnectAttempts;

    this.updateStatus('connected');
    this.state.lastConnected = new Date();
    this.metrics.totalConnections++;
    this.sessionStartTime = Date.now();

    if (wasReconnecting && reconnectAttempts > 0) {
      this.metrics.successfulReconnects++;
      console.log(
        `[ConnectionManager] Reconnected successfully after ${reconnectAttempts} attempts`
      );
    }

    // Reset reconnection state
    this.state.reconnectAttempts = 0;
    this.state.reconnectDelay = this.config.initialDelay;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private handleDisconnect(reason: string): void {
    this.updateStatus('disconnected');
    this.state.lastDisconnected = new Date();
    this.metrics.totalDisconnections++;

    if (this.state.lastConnected) {
      this.metrics.connectionUptime += Date.now() - this.sessionStartTime;
    }

    const shouldReconnect =
      this.state.isAutoReconnectEnabled &&
      reason !== 'io client disconnect' &&
      reason !== 'client namespace disconnect';

    if (shouldReconnect) {
      console.log('[ConnectionManager] Auto-reconnect enabled, starting reconnection process');
      this.scheduleReconnection();
    } else {
      console.log(
        `[ConnectionManager] Not reconnecting. Reason: ${reason}, Auto-reconnect: ${this.state.isAutoReconnectEnabled}`
      );
    }
  }

  private handleConnectionError(error: Error): void {
    console.error('[ConnectionManager] Connection error:', error.message);

    if (this.state.status === 'reconnecting') {
      this.handleReconnectionFailure(error.message);
    } else {
      this.updateStatus('failed');
    }
  }

  private scheduleReconnection(): void {
    if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
      console.log('[ConnectionManager] Max reconnection attempts reached');
      this.updateStatus('failed');
      return;
    }

    this.updateStatus('reconnecting');
    this.state.reconnectAttempts++;
    this.metrics.totalReconnectAttempts++;

    console.log(
      `[ConnectionManager] Scheduling reconnection attempt ${this.state.reconnectAttempts}/${this.state.maxReconnectAttempts} in ${this.state.reconnectDelay}ms`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.attemptReconnection();
    }, this.state.reconnectDelay);

    // Increase delay for next attempt (exponential backoff)
    this.state.reconnectDelay = Math.min(
      this.state.reconnectDelay * this.config.backoffMultiplier,
      this.state.maxReconnectDelay
    );
  }

  private attemptReconnection(): void {
    if (!this.socket) {
      console.error('[ConnectionManager] Cannot reconnect: no socket available');
      return;
    }

    console.log(
      `[ConnectionManager] Attempting reconnection (${this.state.reconnectAttempts}/${this.state.maxReconnectAttempts})`
    );

    try {
      this.socket.connect();
    } catch (error) {
      console.error('[ConnectionManager] Error during reconnection attempt:', error);
      this.handleReconnectionFailure(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private handleReconnectionFailure(error: string): void {
    console.log('[ConnectionManager] Reconnection attempt failed:', error);

    if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
      this.updateStatus('failed');
    } else {
      this.scheduleReconnection();
    }
  }

  private startPingMonitoring(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    this.pingIntervalId = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 5000);
  }

  private stopPingMonitoring(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private handlePong(): void {
    if (this.lastPingTime > 0) {
      const latency = Date.now() - this.lastPingTime;
      this.state.latency = latency;

      const oldQuality = this.state.connectionQuality;
      let newQuality: ConnectionState['connectionQuality'];

      if (latency < 100) {
        newQuality = 'excellent';
      } else if (latency < 300) {
        newQuality = 'good';
      } else {
        newQuality = 'poor';
      }

      if (newQuality !== oldQuality) {
        this.state.connectionQuality = newQuality;
        console.log(
          `[ConnectionManager] Connection quality changed: ${oldQuality} -> ${newQuality} (${latency}ms)`
        );
      }

      if (this.metrics.averageLatency) {
        this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
      } else {
        this.metrics.averageLatency = latency;
      }
    }
  }

  private updateStatus(newStatus: ConnectionStatus): void {
    const oldStatus = this.state.status;
    if (oldStatus !== newStatus) {
      this.state.status = newStatus;
      console.log(`[ConnectionManager] Status changed: ${oldStatus} -> ${newStatus}`);
    }
  }

  public destroy(): void {
    console.log('[ConnectionManager] Destroying connection manager');

    this.stopReconnection();
    this.stopPingMonitoring();
    this.cleanupSocketListeners();
    this.eventListeners.clear();
    this.socket = null;
  }
}