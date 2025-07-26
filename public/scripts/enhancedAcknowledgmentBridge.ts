// Integration Bridge - Enhanced Error Display with Socket Acknowledgments
// Recommendation #7: Enhanced Error Display & UX improvements

import {
  emitJoinGame,
  emitStartGame,
  emitRejoin,
} from './acknowledgmentUtils.js';
import { errorDisplay } from './enhancedErrorDisplay.js';

/**
 * Enhanced acknowledgment wrappers with better UX
 * These replace the basic acknowledgment utilities with enhanced error display
 */
export class EnhancedAcknowledgmentBridge {
  /**
   * Enhanced JOIN_GAME with progress indicator and better error handling
   */
  static async joinGameWithProgress(
    socket: any,
    payload: any,
    options: {
      onSuccess?: (response: any) => void;
      onError?: (error: string) => void;
      showProgress?: boolean;
      progressMessage?: string;
    } = {}
  ): Promise<void> {
    const {
      onSuccess = () => {},
      onError = () => {},
      showProgress = true,
      progressMessage = 'Joining game...',
    } = options;

    // Show progress indicator
    if (showProgress) {
      errorDisplay.showProgress({
        message: progressMessage,
        type: 'spinner',
        timeout: 10000, // 10 second timeout
      });
    }

    try {
      // Use existing acknowledgment utility but with enhanced error handling
      await emitJoinGame(socket, payload, {
        onSuccess: (response) => {
          errorDisplay.hideProgress();
          errorDisplay.showError('Successfully joined the game!', {
            type: 'success',
            duration: 2000,
            showDismissButton: false,
          });
          onSuccess(response);
        },
        onError: (error) => {
          errorDisplay.hideProgress();
          errorDisplay.showError(error, {
            type: 'error',
            persistent: false,
            showRetryButton: true,
            onRetry: () => {
              this.joinGameWithProgress(socket, payload, options);
            },
          });
          onError(error);
        },
      });
    } catch (error) {
      errorDisplay.hideProgress();
      errorDisplay.showError(
        error instanceof Error ? error.message : 'Failed to join game',
        {
          type: 'error',
          persistent: false,
          showRetryButton: true,
          onRetry: () => {
            this.joinGameWithProgress(socket, payload, options);
          },
        }
      );
      onError(error instanceof Error ? error.message : 'Failed to join game');
    }
  }

  /**
   * Enhanced START_GAME with progress indicator
   */
  static async startGameWithProgress(
    socket: any,
    payload: any,
    options: {
      onSuccess?: (response: any) => void;
      onError?: (error: string) => void;
      showProgress?: boolean;
    } = {}
  ): Promise<void> {
    const {
      onSuccess = () => {},
      onError = () => {},
      showProgress = true,
    } = options;

    if (showProgress) {
      errorDisplay.showProgress({
        message: 'Starting game...',
        type: 'dots',
        timeout: 8000,
      });
    }

    try {
      await emitStartGame(socket, payload, {
        onSuccess: (response) => {
          errorDisplay.hideProgress();
          errorDisplay.showError('Game started successfully!', {
            type: 'success',
            duration: 2000,
            showDismissButton: false,
          });
          onSuccess(response);
        },
        onError: (error) => {
          errorDisplay.hideProgress();
          errorDisplay.showError(error, {
            type: 'error',
            showRetryButton: true,
            onRetry: () => {
              this.startGameWithProgress(socket, payload, options);
            },
          });
          onError(error);
        },
      });
    } catch (error) {
      errorDisplay.hideProgress();
      errorDisplay.showError(
        error instanceof Error ? error.message : 'Failed to start game',
        {
          type: 'error',
          showRetryButton: true,
          onRetry: () => {
            this.startGameWithProgress(socket, payload, options);
          },
        }
      );
      onError(error instanceof Error ? error.message : 'Failed to start game');
    }
  }

  /**
   * Enhanced REJOIN with progress indicator
   */
  static async rejoinWithProgress(
    socket: any,
    payload: any,
    options: {
      onSuccess?: (response: any) => void;
      onError?: (error: string) => void;
      showProgress?: boolean;
    } = {}
  ): Promise<void> {
    const {
      onSuccess = () => {},
      onError = () => {},
      showProgress = true,
    } = options;

    if (showProgress) {
      errorDisplay.showProgress({
        message: 'Reconnecting to game...',
        type: 'spinner',
        timeout: 15000,
      });
    }

    try {
      await emitRejoin(socket, payload, {
        onSuccess: (response) => {
          errorDisplay.hideProgress();
          errorDisplay.showError('Successfully reconnected!', {
            type: 'success',
            duration: 2000,
            showDismissButton: false,
          });
          onSuccess(response);
        },
        onError: (error) => {
          errorDisplay.hideProgress();
          errorDisplay.showError(error, {
            type: 'error',
            persistent: true,
            showRetryButton: true,
            showDismissButton: true,
            onRetry: () => {
              this.rejoinWithProgress(socket, payload, options);
            },
            onDismiss: () => {
              // Clear session and redirect to lobby
              if (typeof window !== 'undefined') {
                localStorage.removeItem('currentRoom');
                localStorage.removeItem('playerId');
                window.location.reload();
              }
            },
          });
          onError(error);
        },
      });
    } catch (error) {
      errorDisplay.hideProgress();
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reconnect';
      errorDisplay.showError(errorMessage, {
        type: 'error',
        persistent: true,
        showRetryButton: true,
        showDismissButton: true,
        onRetry: () => {
          this.rejoinWithProgress(socket, payload, options);
        },
        onDismiss: () => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentRoom');
            localStorage.removeItem('playerId');
            window.location.reload();
          }
        },
      });
      onError(errorMessage);
    }
  }

  /**
   * Enhanced connection monitoring with user-friendly status
   */
  static initializeConnectionMonitoring(socket: any): void {
    socket.on('connect', () => {
      console.log('[CLIENT] Connection established');
      errorDisplay.showConnectionStatus(
        'connected',
        'Connected to game server'
      );
    });

    socket.on('disconnect', (reason: string) => {
      console.warn('[CLIENT] Connection lost:', reason);

      let userFriendlyReason = 'Connection lost';
      if (reason === 'transport close') {
        userFriendlyReason = 'Network connection interrupted';
      } else if (reason === 'ping timeout') {
        userFriendlyReason = 'Connection timed out';
      } else if (reason === 'transport error') {
        userFriendlyReason = 'Network error occurred';
      }

      errorDisplay.showConnectionStatus('disconnected', userFriendlyReason);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('[CLIENT] Connection error:', error);
      errorDisplay.showConnectionStatus(
        'disconnected',
        'Failed to connect to server'
      );
    });

    socket.on('reconnect_attempt', () => {
      console.log('[CLIENT] Attempting to reconnect...');
      errorDisplay.showConnectionStatus(
        'reconnecting',
        'Attempting to reconnect...'
      );
    });

    socket.on('reconnect', () => {
      console.log('[CLIENT] Reconnected successfully');
      errorDisplay.showConnectionStatus(
        'connected',
        'Reconnected successfully'
      );
    });

    socket.on('reconnect_failed', () => {
      console.error('[CLIENT] Reconnection failed');
      errorDisplay.showConnectionStatus('disconnected', 'Failed to reconnect');
    });
  }

  /**
   * Show validation errors with enhanced display
   */
  static showValidationErrors(errors: string[]): void {
    if (errors.length === 0) return;

    if (errors.length === 1) {
      errorDisplay.showError(errors[0], {
        type: 'warning',
        duration: 4000,
        showDismissButton: true,
      });
    } else {
      const errorMessage = `Please fix ${errors.length} validation errors:\n• ${errors.join('\n• ')}`;
      errorDisplay.showError(errorMessage, {
        type: 'warning',
        persistent: true,
        showDismissButton: true,
      });
    }
  }

  /**
   * Show button state feedback
   */
  static showButtonFeedback(
    buttonId: string,
    state: 'loading' | 'success' | 'error' | 'reset',
    message?: string
  ): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (!button) return;

    // Store original state if not already stored
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent || '';
      button.dataset.originalDisabled = button.disabled.toString();
    }

    switch (state) {
      case 'loading':
        button.disabled = true;
        button.textContent = message || 'Please wait...';
        button.classList.add('loading');
        break;

      case 'success':
        button.disabled = false;
        button.textContent = message || 'Success!';
        button.classList.remove('loading');
        button.classList.add('success');
        // Auto-reset after 2 seconds
        setTimeout(() => this.showButtonFeedback(buttonId, 'reset'), 2000);
        break;

      case 'error':
        button.disabled = false;
        button.textContent = message || 'Try Again';
        button.classList.remove('loading');
        button.classList.add('error');
        // Auto-reset after 3 seconds
        setTimeout(() => this.showButtonFeedback(buttonId, 'reset'), 3000);
        break;

      case 'reset':
        button.disabled = button.dataset.originalDisabled === 'true';
        button.textContent = button.dataset.originalText || '';
        button.classList.remove('loading', 'success', 'error');
        break;
    }
  }
}

// Export convenience functions
export const {
  joinGameWithProgress,
  startGameWithProgress,
  rejoinWithProgress,
  initializeConnectionMonitoring,
  showValidationErrors,
  showButtonFeedback,
} = EnhancedAcknowledgmentBridge;
