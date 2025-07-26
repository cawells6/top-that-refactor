// Socket.IO Acknowledgment Utilities with Timeout and Retry Logic
import { displayValidationErrors } from './validation.js';

export interface AckOptions {
  timeout?: number; // milliseconds, default 5000
  retries?: number; // number of retry attempts, default 2
  showUserFeedback?: boolean; // show connection status to user, default true
  onTimeout?: () => void; // callback for timeout
  onRetry?: (attempt: number) => void; // callback for retry attempts
  onSuccess?: (response: any) => void; // callback for successful response
  onError?: (error: string) => void; // callback for error response
}

export interface AckResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  attempts: number;
  totalTime: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastPing: number;
  retryCount: number;
  isRetrying: boolean;
}

let connectionStatus: ConnectionStatus = {
  isConnected: true,
  lastPing: Date.now(),
  retryCount: 0,
  isRetrying: false,
};

/**
 * Wraps a Socket.IO emit with acknowledgment, timeout, and retry logic
 */
export function emitWithAck(
  socket: any,
  event: string,
  data: any,
  options: AckOptions = {}
): Promise<AckResponse> {
  const {
    timeout = 5000,
    retries = 2,
    showUserFeedback = true,
    onTimeout,
    onRetry,
    onSuccess,
    onError,
  } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();
    let attempts = 0;

    const attemptEmit = () => {
      attempts++;
      
      if (showUserFeedback && attempts > 1 && onRetry) {
        onRetry(attempts);
      }

      const timeoutId = setTimeout(() => {
        // Timeout occurred
        const timeElapsed = Date.now() - startTime;
        
        if (attempts <= retries) {
          // Retry
          connectionStatus.retryCount++;
          connectionStatus.isRetrying = true;
          
          if (showUserFeedback) {
            showConnectionStatus(
              `Connection timeout. Retrying... (${attempts}/${retries})`
            );
          }
          
          setTimeout(() => attemptEmit(), Math.min(1000 * attempts, 5000)); // Exponential backoff
        } else {
          // All retries exhausted
          connectionStatus.isRetrying = false;
          
          if (showUserFeedback) {
            showConnectionStatus(
              'Connection failed. Please check your network and try again.',
              'error'
            );
          }
          
          if (onTimeout) onTimeout();
          
          resolve({
            success: false,
            error: 'Connection timeout after retries',
            attempts,
            totalTime: timeElapsed,
          });
        }
      }, timeout);

      // Emit with acknowledgment
      socket.emit(event, data, (response: any) => {
        clearTimeout(timeoutId);
        const timeElapsed = Date.now() - startTime;
        
        connectionStatus.isRetrying = false;
        connectionStatus.lastPing = Date.now();
        
        if (showUserFeedback && attempts > 1) {
          showConnectionStatus('Connection restored!', 'success');
          setTimeout(() => hideConnectionStatus(), 2000);
        }

        // Check if response indicates an error
        if (response && (response.error || response.success === false)) {
          if (onError) onError(response.error || 'Unknown error');
          
          resolve({
            success: false,
            error: response.error || 'Request failed',
            code: response.code,
            attempts,
            totalTime: timeElapsed,
          });
        } else {
          if (onSuccess) onSuccess(response);
          
          resolve({
            success: true,
            data: response,
            attempts,
            totalTime: timeElapsed,
          });
        }
      });
    };

    // Check socket connection before attempting
    if (!socket || !socket.connected) {
      connectionStatus.isConnected = false;
      
      if (showUserFeedback) {
        showConnectionStatus(
          'Not connected to server. Attempting to reconnect...',
          'warning'
        );
      }
      
      resolve({
        success: false,
        error: 'Socket not connected',
        attempts: 0,
        totalTime: 0,
      });
      return;
    }

    connectionStatus.isConnected = true;
    attemptEmit();
  });
}

/**
 * Creates a wrapper for JOIN_GAME emissions with comprehensive error handling
 */
export function emitJoinGame(
  socket: any,
  playerData: any,
  options: Partial<AckOptions> = {}
): Promise<AckResponse> {
  return emitWithAck(socket, 'join-game', playerData, {
    timeout: 8000, // Longer timeout for join operations
    retries: 3,
    showUserFeedback: true,
    onRetry: (attempt) => {
      showConnectionStatus(`Joining game... attempt ${attempt}`, 'info');
    },
    onError: (error) => {
      displayValidationErrors([error]);
    },
    ...options,
  });
}

/**
 * Creates a wrapper for REJOIN emissions with comprehensive error handling
 */
export function emitRejoin(
  socket: any,
  rejoinData: any,
  options: Partial<AckOptions> = {}
): Promise<AckResponse> {
  return emitWithAck(socket, 'rejoin', rejoinData, {
    timeout: 6000,
    retries: 3,
    showUserFeedback: true,
    onRetry: (attempt) => {
      showConnectionStatus(`Reconnecting... attempt ${attempt}`, 'info');
    },
    onError: (error) => {
      displayValidationErrors([error]);
    },
    ...options,
  });
}

/**
 * Creates a wrapper for PLAY_CARD emissions with retry logic
 */
export function emitPlayCard(
  socket: any,
  playData: any,
  options: Partial<AckOptions> = {}
): Promise<AckResponse> {
  return emitWithAck(socket, 'play-card', playData, {
    timeout: 4000,
    retries: 2,
    showUserFeedback: false, // Don't show feedback for gameplay actions
    ...options,
  });
}

/**
 * Creates a wrapper for START_GAME emissions
 */
export function emitStartGame(
  socket: any,
  startOptions: any = {},
  options: Partial<AckOptions> = {}
): Promise<AckResponse> {
  return emitWithAck(socket, 'start-game', startOptions, {
    timeout: 6000,
    retries: 2,
    showUserFeedback: true,
    onRetry: (attempt) => {
      showConnectionStatus(`Starting game... attempt ${attempt}`, 'info');
    },
    ...options,
  });
}

/**
 * Shows connection status message to user
 */
function showConnectionStatus(
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
) {
  let container = document.getElementById('connection-status-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'connection-status-container';
    container.className = 'connection-status-container';
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <div class="connection-status connection-status--${type}">
      <span class="connection-status__icon">
        ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
      </span>
      <span class="connection-status__message">${message}</span>
    </div>
  `;
  
  container.style.display = 'block';
  container.classList.add('connection-status--show');
}

/**
 * Hides connection status message
 */
function hideConnectionStatus() {
  const container = document.getElementById('connection-status-container');
  if (container) {
    container.classList.remove('connection-status--show');
    setTimeout(() => {
      container.style.display = 'none';
    }, 300);
  }
}

/**
 * Monitors socket connection health
 */
export function initializeConnectionMonitoring(socket: any) {
  if (!socket) return;

  // Monitor connection status
  socket.on('connect', () => {
    connectionStatus.isConnected = true;
    connectionStatus.lastPing = Date.now();
    connectionStatus.retryCount = 0;
    connectionStatus.isRetrying = false;
    
    hideConnectionStatus();
  });

  socket.on('disconnect', (reason: string) => {
    connectionStatus.isConnected = false;
    
    if (reason === 'io server disconnect') {
      // Server disconnected the socket, show permanent message
      showConnectionStatus('Disconnected from server. Please refresh the page.', 'error');
    } else {
      // Network issue, show temporary message
      showConnectionStatus('Connection lost. Attempting to reconnect...', 'warning');
    }
  });

  socket.on('connect_error', (_error: any) => {
    connectionStatus.isConnected = false;
    showConnectionStatus('Connection error. Retrying...', 'warning');
  });

  // Periodic connection health check
  setInterval(() => {
    if (connectionStatus.isConnected && !connectionStatus.isRetrying) {
      const timeSinceLastPing = Date.now() - connectionStatus.lastPing;
      
      // If no activity for 30 seconds, ping the server
      if (timeSinceLastPing > 30000) {
        socket.emit('ping', { timestamp: Date.now() }, (_response: any) => {
          connectionStatus.lastPing = Date.now();
        });
      }
    }
  }, 10000); // Check every 10 seconds
}

/**
 * Gets current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return { ...connectionStatus };
}

/**
 * Resets connection status (useful for testing)
 */
export function resetConnectionStatus() {
  connectionStatus = {
    isConnected: true,
    lastPing: Date.now(),
    retryCount: 0,
    isRetrying: false,
  };
  hideConnectionStatus();
}
