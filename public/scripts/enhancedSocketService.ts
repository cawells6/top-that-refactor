// Enhanced socket service with connection management and reconnection logic

import { io, Socket } from 'socket.io-client';

import { ConnectionManager } from './connectionManager.js';
import { ConnectionStatus } from './types/connectionTypes.js';
import { renderGameState } from './render.js';
import * as state from './state.js';
import {
  showLobbyForm,
  showWaitingState,
  showGameTable,
  showError,
  showConnectionStatus,
} from './uiManager.js';
import {
  JOINED,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  REJOIN,
  ERROR as ERROR_EVENT,
} from '../../src/shared/events.js';
import { GameStateData, RejoinData } from '../../src/shared/types.js';

export class EnhancedSocketService {
  private socket: Socket | null = null;
  private connectionManager: ConnectionManager;
  private isInitialized: boolean = false;
  private reconnectionInProgress: boolean = false;

  constructor() {
    this.connectionManager = new ConnectionManager({
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      enableAutoReconnect: true,
    });

    this.setupConnectionManagerListeners();
  }

  public async initialize(serverUrl?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[EnhancedSocketService] Already initialized');
      return;
    }

    try {
      console.log('[EnhancedSocketService] Initializing socket connection...');

      // Create socket connection
      const url = serverUrl || window.location.origin;
      this.socket = io(url, {
        autoConnect: true,
        reconnection: false, // We handle reconnection manually
        timeout: 5000,
      });

      // Set up socket with connection manager
      this.connectionManager.setSocket(this.socket);

      this.isInitialized = true;

      console.log('[EnhancedSocketService] Socket service initialized');
    } catch (error) {
      console.error('[EnhancedSocketService] Failed to initialize:', error);
      throw error;
    }
  }

  public setExistingSocket(socket: Socket): void {
    if (this.isInitialized) {
      console.log('[EnhancedSocketService] Socket already initialized, replacing with new socket');
    }

    this.socket = socket;
    this.connectionManager.setSocket(socket);
    this.isInitialized = true;

    console.log('[EnhancedSocketService] Using existing socket:', socket.id);
  }  public getConnectionStatus(): ConnectionStatus {
    return this.connectionManager.getState().status;
  }

  public getConnectionMetrics() {
    return this.connectionManager.getMetrics();
  }

  public forceReconnect(): void {
    console.log('[EnhancedSocketService] Manual reconnection requested');
    this.connectionManager.forceReconnect();
  }

  public enableAutoReconnect(): void {
    this.connectionManager.enableAutoReconnect();
  }

  public stopReconnection(): void {
    this.connectionManager.stopReconnection();
  }

  public emit(event: string, ...args: any[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`[EnhancedSocketService] Cannot emit ${event}: socket not connected`);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private setupConnectionManagerListeners(): void {
    // Note: We'd use the event system here if we kept it in the connection manager
    // For now, we'll monitor status changes through polling or direct state access
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) {
      console.error('[EnhancedSocketService] Cannot setup handlers: no socket');
      return;
    }

    console.log('[EnhancedSocketService] Setting up socket event handlers');

    // Handle successful connection and potential rejoin
    this.socket.on('connect', () => {
      console.log('[EnhancedSocketService] Socket connected, checking for rejoin');
      this.handleConnectionEstablished();
    });

    // Game state and lobby events
    this.socket.on(JOINED, (data: { id: string; name: string; roomId: string }) => {
      console.log('[EnhancedSocketService] Received JOINED event:', data);
      state.setMyId(data.id);
      state.setCurrentRoom(data.roomId);
      state.saveSession();
      this.reconnectionInProgress = false;
    });

    this.socket.on(
      LOBBY_STATE_UPDATE,
      (data: {
        roomId: string;
        players: { id: string; name: string; status: string }[];
        hostId: string | null;
        started?: boolean;
      }) => {
        console.log('[EnhancedSocketService] Received LOBBY_STATE_UPDATE:', data);
        
        if (data.started) {
          showGameTable();
        } else {
          // Convert status to ready boolean for compatibility
          const playersWithReady = data.players.map(player => ({
            ...player,
            ready: player.status === 'ready' || player.status === 'host',
          }));
          
          showWaitingState(
            data.roomId,
            playersWithReady.length,
            playersWithReady.length,
            playersWithReady
          );
        }
      }
    );

    this.socket.on(STATE_UPDATE, (gameState: GameStateData) => {
      console.log('[EnhancedSocketService] Received STATE_UPDATE');
      renderGameState(gameState, state.myId);
      if (gameState.started) {
        showGameTable();
      }
    });

    this.socket.on(ERROR_EVENT, (errorMessage: string) => {
      console.error('[EnhancedSocketService] Received error event:', errorMessage);
      showError(errorMessage);
      
      // If this is a rejoin-related error, clear session and show lobby
      if (errorMessage.includes('not found') || errorMessage.includes('rejoin')) {
        this.clearSessionAndShowLobby();
      }
    });

    // Handle ping for connection quality monitoring
    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });

    console.log('[EnhancedSocketService] Socket event handlers set up');
  }

  private handleConnectionEstablished(): void {
    console.log('[EnhancedSocketService] Connection established, checking session...');
    
    // Update UI to show connected status
    showConnectionStatus('connected');

    if (state.myId && state.currentRoom && !this.reconnectionInProgress) {
      console.log('[EnhancedSocketService] Attempting rejoin with stored session');
      this.attemptRejoin();
    } else {
      console.log('[EnhancedSocketService] No stored session, showing lobby form');
      showLobbyForm();
    }
  }

  private attemptRejoin(): void {
    if (!this.socket?.connected || !state.myId || !state.currentRoom) {
      console.log('[EnhancedSocketService] Cannot rejoin: missing requirements');
      this.clearSessionAndShowLobby();
      return;
    }

    this.reconnectionInProgress = true;
    console.log('[EnhancedSocketService] Attempting rejoin...');
    showConnectionStatus('reconnecting');

    const rejoinData: RejoinData = {
      playerId: state.myId!,
      roomId: state.currentRoom!,
    };

    // Set up one-time acknowledgment handler
    this.socket.emit(REJOIN, rejoinData, (response: { success: boolean; error?: string }) => {
      console.log('[EnhancedSocketService] Rejoin response:', response);
      
      if (response.success) {
        console.log('[EnhancedSocketService] Rejoin successful');
        showConnectionStatus('connected');
        this.reconnectionInProgress = false;
      } else {
        console.log('[EnhancedSocketService] Rejoin failed:', response.error);
        this.clearSessionAndShowLobby();
      }
    });

    // Timeout for rejoin attempt
    setTimeout(() => {
      if (this.reconnectionInProgress) {
        console.log('[EnhancedSocketService] Rejoin timed out');
        this.clearSessionAndShowLobby();
      }
    }, 5000);
  }

  private clearSessionAndShowLobby(): void {
    console.log('[EnhancedSocketService] Clearing session and showing lobby');
    
    state.setCurrentRoom(null);
    state.setMyId(null);
    state.saveSession();
    this.reconnectionInProgress = false;
    
    showLobbyForm();
    showConnectionStatus('connected');
  }

  public destroy(): void {
    console.log('[EnhancedSocketService] Destroying socket service');
    
    this.connectionManager.destroy();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isInitialized = false;
  }
}

// Create and export singleton instance
export const socketService = new EnhancedSocketService();

// Legacy compatibility functions for existing code
export async function initializeSocketHandlers(): Promise<void> {
  await socketService.initialize();
}

export function isSocketConnected(): boolean {
  return socketService.isConnected();
}

export function emitToSocket(event: string, ...args: any[]): void {
  socketService.emit(event, ...args);
}
