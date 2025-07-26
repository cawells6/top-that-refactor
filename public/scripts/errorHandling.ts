// Client-side error handling utilities

export interface SocketTimeoutOptions {
  timeout: number; // milliseconds
  timeoutMessage?: string;
}

export function emitWithTimeout<T = any>(
  socket: any,
  event: string,
  data: any,
  options: SocketTimeoutOptions = { timeout: 5000 }
): Promise<T> {
  return new Promise((resolve, reject) => {
    let timeoutId: number | null = null;
    let responded = false;

    // Set up timeout
    timeoutId = window.setTimeout(() => {
      if (!responded) {
        responded = true;
        reject(
          new Error(
            options.timeoutMessage ||
              `Request timed out after ${options.timeout}ms`
          )
        );
      }
    }, options.timeout);

    // Emit with callback
    socket.emit(event, data, (response: T) => {
      if (!responded) {
        responded = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(response);
      }
    });
  });
}

// Enhanced error message mapping for better UX
export function getErrorMessage(
  errorCode?: string,
  fallbackMessage?: string
): string {
  const errorMessages: { [key: string]: string } = {
    GAME_FULL:
      'This game is full. Please try creating a new game or joining a different one.',
    GAME_ALREADY_STARTED:
      'This game has already started. Please create a new game.',
    ROOM_NOT_FOUND:
      'Game room not found. Please check the room code and try again.',
    INVALID_PAYLOAD: 'Please check your input and try again.',
    DUPLICATE_JOIN: 'You are already in this game.',
    INVALID_PLAYER_NAME: 'Please enter a valid player name.',
    CONNECTION_ERROR:
      'Connection error. Please check your internet and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    INVALID_REJOIN_DATA: 'Unable to reconnect. Please join a new game.',
    REJOIN_FAILED: 'Failed to reconnect to the game.',
  };

  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  return fallbackMessage || 'An unexpected error occurred. Please try again.';
}

// Connection status utility
export class ConnectionMonitor {
  private socket: any;
  private onConnectionChange?: (connected: boolean) => void;

  constructor(socket: any, onConnectionChange?: (connected: boolean) => void) {
    this.socket = socket;
    this.onConnectionChange = onConnectionChange;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on('connect', () => {
      console.log('[CLIENT] Connection established');
      this.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn('[CLIENT] Connection lost:', reason);
      this.onConnectionChange?.(false);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[CLIENT] Connection error:', error);
      this.onConnectionChange?.(false);
    });
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
