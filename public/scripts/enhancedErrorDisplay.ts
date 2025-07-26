// Enhanced Error Display System - Recommendation #7
// Builds on existing queueMessage system with improved UX

// Note: Error codes imported when available, falls back to local mapping

export interface ErrorDisplayOptions {
  type?: 'error' | 'warning' | 'info' | 'success';
  persistent?: boolean; // If true, error stays until user dismisses
  showRetryButton?: boolean;
  showDismissButton?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  duration?: number; // Auto-hide after milliseconds (default: 4000)
  position?: 'top' | 'bottom' | 'center';
}

export interface ProgressIndicatorOptions {
  message: string;
  type?: 'spinner' | 'dots' | 'bar';
  timeout?: number; // Auto-hide after timeout
}

/**
 * Enhanced error display class that provides better UX than basic queueMessage
 */
export class EnhancedErrorDisplay {
  private activeToasts: Map<string, HTMLElement> = new Map();
  private progressIndicator: HTMLElement | null = null;

  // Local error message mapping for common error codes
  private LOCAL_ERROR_MESSAGES: Record<string, string> = {
    GAME_FULL:
      'This game is full. Please try joining another game or create a new one.',
    GAME_ALREADY_STARTED:
      'This game has already started. Please create a new game.',
    ROOM_NOT_FOUND:
      'Game room not found. Please check the room code and try again.',
    INVALID_INPUT: 'Please check your input and try again.',
    TIMEOUT: 'Request timed out. Please check your connection and try again.',
    CONNECTION_ERROR:
      'Connection error. Please check your internet and try again.',
    INVALID_PLAYER_NAME:
      'Please enter a valid player name (2-20 characters, letters and numbers only).',
    PLAYER_ALREADY_IN_GAME: 'You are already in this game.',
  };

  /**
   * Display a user-friendly error message with enhanced UX
   */
  showError(
    error: string | { code?: string; message?: string },
    options: ErrorDisplayOptions = {}
  ): string {
    const errorId = Date.now().toString();

    // Parse error and get user-friendly message
    let errorMessage: string;
    let errorCode: string | undefined;

    if (typeof error === 'string') {
      errorMessage = this.getUserFriendlyMessage(error);
    } else {
      errorCode = error.code;
      errorMessage = this.getUserFriendlyMessage(
        error.message || '',
        error.code
      );
    }

    // Default options
    const opts: Required<ErrorDisplayOptions> = {
      type: 'error',
      persistent: false,
      showRetryButton: false,
      showDismissButton: true,
      onRetry: () => {},
      onDismiss: () => this.dismissError(errorId),
      duration: 4000,
      position: 'top',
      ...options,
    };

    // Create enhanced error toast
    const toast = this.createErrorToast(errorId, errorMessage, errorCode, opts);

    // Add to DOM
    document.body.appendChild(toast);
    this.activeToasts.set(errorId, toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('error-toast--show');
    });

    // Auto-hide if not persistent
    if (!opts.persistent) {
      setTimeout(() => {
        this.dismissError(errorId);
      }, opts.duration);
    }

    return errorId;
  }

  /**
   * Show connection status message
   */
  showConnectionStatus(
    status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting',
    details?: string
  ): void {
    const messages = {
      connecting: 'Connecting to server...',
      connected: 'Connected successfully',
      disconnected: 'Connection lost',
      reconnecting: 'Reconnecting...',
    };

    const types = {
      connecting: 'info' as const,
      connected: 'success' as const,
      disconnected: 'error' as const,
      reconnecting: 'warning' as const,
    };

    const message = details || messages[status];
    const isPersistent = status === 'disconnected' || status === 'reconnecting';

    this.showError(message, {
      type: types[status],
      persistent: isPersistent,
      showRetryButton: status === 'disconnected',
      onRetry: () => window.location.reload(),
      duration: status === 'connected' ? 2000 : 4000,
    });
  }

  /**
   * Show progress indicator for loading operations
   */
  showProgress(options: ProgressIndicatorOptions): void {
    this.hideProgress(); // Hide any existing progress

    const { message, type = 'spinner', timeout } = options;

    this.progressIndicator = document.createElement('div');
    this.progressIndicator.className = 'progress-indicator';
    this.progressIndicator.innerHTML = `
      <div class="progress-indicator__content">
        <div class="progress-indicator__animation progress-indicator__animation--${type}">
          ${this.getProgressAnimation(type)}
        </div>
        <span class="progress-indicator__message">${message}</span>
      </div>
    `;

    document.body.appendChild(this.progressIndicator);

    // Animate in
    requestAnimationFrame(() => {
      this.progressIndicator?.classList.add('progress-indicator--show');
    });

    // Auto-hide if timeout specified
    if (timeout) {
      setTimeout(() => {
        this.hideProgress();
      }, timeout);
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgress(): void {
    if (this.progressIndicator) {
      this.progressIndicator.classList.remove('progress-indicator--show');
      setTimeout(() => {
        if (this.progressIndicator) {
          this.progressIndicator.remove();
          this.progressIndicator = null;
        }
      }, 300);
    }
  }

  /**
   * Dismiss a specific error
   */
  dismissError(errorId: string): void {
    const toast = this.activeToasts.get(errorId);
    if (toast) {
      toast.classList.remove('error-toast--show');
      setTimeout(() => {
        toast.remove();
        this.activeToasts.delete(errorId);
      }, 300);
    }
  }

  /**
   * Dismiss all active errors
   */
  dismissAllErrors(): void {
    this.activeToasts.forEach((_, errorId) => {
      this.dismissError(errorId);
    });
  }

  /**
   * Convert technical error messages to user-friendly ones
   */
  private getUserFriendlyMessage(message: string, code?: string): string {
    // First check if we have a code and use local error mapping
    if (code && this.LOCAL_ERROR_MESSAGES[code]) {
      return this.LOCAL_ERROR_MESSAGES[code];
    }

    // Pattern matching for common error scenarios
    const patterns = [
      {
        pattern: /GAME_FULL|game.*full/i,
        message:
          'This game is full. Please try joining another game or create a new one.',
      },
      {
        pattern: /GAME_ALREADY_STARTED|already.*started/i,
        message: 'This game has already started. Please create a new game.',
      },
      {
        pattern: /ROOM_NOT_FOUND|room.*not.*found/i,
        message:
          'Game room not found. Please check the room code and try again.',
      },
      {
        pattern: /INVALID_PAYLOAD|invalid.*payload/i,
        message: 'Please check your input and try again.',
      },
      {
        pattern: /timeout|timed.*out/i,
        message:
          'Request timed out. Please check your connection and try again.',
      },
      {
        pattern: /connection.*error|network.*error/i,
        message: 'Connection error. Please check your internet and try again.',
      },
      {
        pattern: /name.*invalid|invalid.*name/i,
        message:
          'Please enter a valid player name (2-20 characters, letters and numbers only).',
      },
      {
        pattern: /duplicate.*join|already.*joined/i,
        message: 'You are already in this game.',
      },
    ];

    // Find matching pattern
    for (const { pattern, message: friendlyMessage } of patterns) {
      if (pattern.test(message)) {
        return friendlyMessage;
      }
    }

    // If no pattern matches, clean up the message
    return this.cleanupErrorMessage(message);
  }

  /**
   * Clean up technical error messages
   */
  private cleanupErrorMessage(message: string): string {
    // Remove common technical prefixes
    const cleanedMessage = message
      .replace(/^\[CLIENT\]\s*/i, '')
      .replace(/^\[SERVER\]\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .replace(/^TypeError:\s*/i, '')
      .trim();

    // Capitalize first letter and ensure it ends with a period
    const capitalized =
      cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
    return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
  }

  /**
   * Create enhanced error toast element
   */
  private createErrorToast(
    errorId: string,
    message: string,
    errorCode: string | undefined,
    options: Required<ErrorDisplayOptions>
  ): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `error-toast error-toast--${options.type}`;
    toast.dataset.errorId = errorId;

    const iconMap = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
    };

    let buttonsHtml = '';
    if (options.showRetryButton) {
      buttonsHtml += `<button class="error-toast__button error-toast__button--retry" data-action="retry">Try Again</button>`;
    }
    if (options.showDismissButton) {
      buttonsHtml += `<button class="error-toast__button error-toast__button--dismiss" data-action="dismiss">×</button>`;
    }

    toast.innerHTML = `
      <div class="error-toast__content">
        <div class="error-toast__header">
          <span class="error-toast__icon">${iconMap[options.type]}</span>
          <span class="error-toast__message">${message}</span>
        </div>
        ${errorCode ? `<div class="error-toast__code">Error: ${errorCode}</div>` : ''}
        ${buttonsHtml ? `<div class="error-toast__actions">${buttonsHtml}</div>` : ''}
      </div>
    `;

    // Add event listeners
    const retryButton = toast.querySelector('[data-action="retry"]');
    const dismissButton = toast.querySelector('[data-action="dismiss"]');

    if (retryButton) {
      retryButton.addEventListener('click', (e) => {
        e.preventDefault();
        options.onRetry();
      });
    }

    if (dismissButton) {
      dismissButton.addEventListener('click', (e) => {
        e.preventDefault();
        options.onDismiss();
      });
    }

    return toast;
  }

  /**
   * Get animation HTML for progress indicators
   */
  private getProgressAnimation(type: string): string {
    switch (type) {
      case 'spinner':
        return '<div class="spinner"></div>';
      case 'dots':
        return '<div class="dots"><span></span><span></span><span></span></div>';
      case 'bar':
        return '<div class="progress-bar"><div class="progress-bar__fill"></div></div>';
      default:
        return '<div class="spinner"></div>';
    }
  }
}

// Export singleton instance
export const errorDisplay = new EnhancedErrorDisplay();

// Convenience functions for backward compatibility
export function showEnhancedError(
  error: string | { code?: string; message?: string },
  options?: ErrorDisplayOptions
): string {
  return errorDisplay.showError(error, options);
}

export function showProgress(options: ProgressIndicatorOptions): void {
  errorDisplay.showProgress(options);
}

export function hideProgress(): void {
  errorDisplay.hideProgress();
}

export function showConnectionStatus(
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting',
  details?: string
): void {
  errorDisplay.showConnectionStatus(status, details);
}
