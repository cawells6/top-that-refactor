// Connection state management types and interfaces

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  isAutoReconnectEnabled: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  latency?: number;
}

export interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  enableAutoReconnect: boolean;
}

export interface ConnectionMetrics {
  totalConnections: number;
  totalDisconnections: number;
  totalReconnectAttempts: number;
  successfulReconnects: number;
  averageLatency?: number;
  connectionUptime: number; // in milliseconds
}

// Events for connection state changes
export const CONNECTION_EVENTS = {
  STATUS_CHANGED: 'connection:status-changed',
  RECONNECT_ATTEMPT: 'connection:reconnect-attempt',
  RECONNECT_SUCCESS: 'connection:reconnect-success',
  RECONNECT_FAILED: 'connection:reconnect-failed',
  QUALITY_CHANGED: 'connection:quality-changed',
} as const;

export interface ConnectionEventPayloads {
  [CONNECTION_EVENTS.STATUS_CHANGED]: {
    oldStatus: ConnectionStatus;
    newStatus: ConnectionStatus;
    timestamp: Date;
  };
  [CONNECTION_EVENTS.RECONNECT_ATTEMPT]: {
    attempt: number;
    maxAttempts: number;
    delay: number;
    timestamp: Date;
  };
  [CONNECTION_EVENTS.RECONNECT_SUCCESS]: {
    attempts: number;
    totalTime: number;
    timestamp: Date;
  };
  [CONNECTION_EVENTS.RECONNECT_FAILED]: {
    attempts: number;
    error?: string;
    timestamp: Date;
  };
  [CONNECTION_EVENTS.QUALITY_CHANGED]: {
    oldQuality: ConnectionState['connectionQuality'];
    newQuality: ConnectionState['connectionQuality'];
    latency?: number;
    timestamp: Date;
  };
}
