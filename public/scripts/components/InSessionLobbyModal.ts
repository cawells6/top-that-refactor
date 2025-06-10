// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, PLAYER_READY } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import { Modal } from './Modal.js';
import * as state from '../state.js';
import { showToast } from '../uiHelpers.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal extends Modal {
  private playersContainer: HTMLElement;
  private copyLinkBtn: HTMLButtonElement;
  private readyUpButton: HTMLButtonElement;
  private guestNameInput: HTMLInputElement;
  private currentRoomId: string = '';

  constructor() {
    const modalElement = document.getElementById('in-session-lobby-modal');
    if (!modalElement) {
      throw new Error(
        'InSessionLobbyModal element not found in the DOM. Ensure it is present in index.html.'
      );
    }
    super(modalElement);

    // Set consistent width that will match the main lobby
    this.setModalWidth(500);

    // Apply professional styling to the modal
    this.applyProfessionalStyling();

    this.playersContainer = this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.readyUpButton = this.modalElement.querySelector('#ready-up-button')!;
    this.guestNameInput = this.modalElement.querySelector('#guest-player-name-input')!;

    // Update input field to match main lobby's "Who's playing today?" field with centered text
    if (this.guestNameInput) {
      this.guestNameInput.setAttribute('placeholder', "Who's playing today?");
      this.guestNameInput.className = 'player-name-input';
      this.guestNameInput.setAttribute(
        'style',
        'width: 100%; padding: 8px 12px; border-radius: 4px; border: 1px solid #ccc; font-size: 16px; text-align: center;'
      );
    }

    // Update button text to be more descriptive
    if (this.copyLinkBtn) {
      this.copyLinkBtn.textContent = 'Copy Invite Link';
    }

    // Ensure the input field is cleared when the modal is created
    this.guestNameInput.value = '';

    // Override the autocomplete attribute to prevent browsers from auto-filling
    this.guestNameInput.setAttribute('autocomplete', 'off');

    // Add a MutationObserver to ensure the field stays empty until user input
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'value' &&
          this.guestNameInput.value !== ''
        ) {
          this.guestNameInput.value = '';
        }
      }
    });

    observer.observe(this.guestNameInput, { attributes: true });

    this.setupSocketListeners();
    this.addEventListeners();
    this.addShareButtonIfNeeded();
  }

  private setupSocketListeners(): void {
    if (!state.socket) return;
    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      console.log('[CLIENT] Received LOBBY_STATE_UPDATE:', lobbyState);
      this.render(lobbyState);
    });
  }

  private addEventListeners(): void {
    this.copyLinkBtn.addEventListener('click', () => {
      const link = `${window.location.origin}?room=${this.currentRoomId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          // Show transient toast instead of altering button text
          const toast = this.modalElement.querySelector('#copy-toast');
          if (toast) {
            toast.textContent = 'Link copied!';
            toast.classList.add('show');
            setTimeout(() => {
              toast.classList.remove('show');
            }, 2000);
          }
          return undefined;
        })
        .catch(() => {});
    });

    this.readyUpButton.addEventListener('click', () => {
      const playerName = this.guestNameInput.value.trim();
      if (playerName) {
        state.socket?.emit(PLAYER_READY, playerName);
        this.readyUpButton.disabled = true;
        this.guestNameInput.disabled = true;
      } else {
        showToast('Please enter your name!', 'error');
      }
    });
  }

  private addShareButtonIfNeeded(): void {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
    if (typeof navigator.share === 'function' && isMobile) {
      const actionsRow = this.modalElement.querySelector('.lobby-buttons-row');
      if (actionsRow) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-link-btn';
        shareBtn.className = 'btn copy-link-btn';
        shareBtn.textContent = 'Share';

        shareBtn.addEventListener('click', async () => {
          const link = `${window.location.origin}?room=${this.currentRoomId}`;
          try {
            await navigator.share({
              title: 'Join my Top That! game',
              text: `Join my game of Top That! The room code is ${this.currentRoomId}`,
              url: link,
            });
          } catch {
            // Share was cancelled or failed.
          }
        });
        actionsRow.insertBefore(shareBtn, this.readyUpButton);
      }
    }
  }

  // Override Modal.show to hide the main lobby and reveal the game table
  override show(): void {
    // Display the game board and hide lobby elements
    uiManager.showGameTable();
    super.show();
  }

  // Simplify the modal styling to match the main lobby approach
  private setModalWidth(width: number): void {
    // Only set width on the outer modal - let CSS handle the rest
    this.modalElement.style.maxWidth = `${width}px`;
    this.modalElement.style.width = '90%';

    // Use the same class structure as the main lobby
    this.modalElement.classList.add('session-modal');

    // Let the background color come from CSS variables like in the main lobby
    const container = this.modalElement.querySelector('.lobby-modal-container');
    if (container instanceof HTMLElement) {
      container.style.width = '100%';
      container.style.maxWidth = `${width - 40}px`;
    }
  }

  private applyProfessionalStyling(): void {
    // Update heading to all uppercase with reduced letter spacing and center alignment
    const heading = this.modalElement.querySelector('h2, h3, .modal-title');
    if (heading) {
      heading.textContent = 'AWAITING PLAYERS';
      // Add letter spacing and center alignment
      (heading as HTMLElement).style.letterSpacing = '-0.05em';
      (heading as HTMLElement).style.textAlign = 'center';
    }

    // Reduce player names container size by half
    if (this.playersContainer) {
      this.playersContainer.setAttribute(
        'style',
        'max-height: 120px; overflow-y: auto; margin: 0 auto; width: 50%; max-width: 200px;'
      );
    }

    // Adjust spacing above buttons
    const buttonRow = this.modalElement.querySelector('.lobby-buttons-row, .button-container');
    if (buttonRow) {
      buttonRow.className += ' mt-4';
      buttonRow.setAttribute('style', 'margin-top: 24px;');
    }

    // Style the copy link button
    if (this.copyLinkBtn) {
      this.copyLinkBtn.setAttribute('style', 'font-weight: 600;');
    }

    // Apply consistent font weights to other buttons
    const buttons = this.modalElement.querySelectorAll('button:not(#copy-link-button)');
    buttons.forEach((button) => {
      button.setAttribute('style', 'font-weight: 600;');
    });

    // Style the input container
    const inputContainer = this.guestNameInput?.parentElement;
    if (inputContainer) {
      inputContainer.className = 'name-input-container';
      inputContainer.setAttribute(
        'style',
        'margin: 16px 0; width: 100%; max-width: 300px; margin: 0 auto;'
      );
    }
  }

  private render(lobbyState: InSessionLobbyState & { started?: boolean }): void {
    console.log('[InSessionLobbyModal] render() called', lobbyState);
    // If the game has started, hide the modal and show the game table
    if (lobbyState.started) {
      this.hide();
      uiManager.showGameTable();
      return;
    }
    // Otherwise, show the modal and keep the game table visible (but not the main game UI)
    this.show();
    // Do NOT call uiManager.showGameTable() here unless the game has started

    this.playersContainer.innerHTML = '';
    lobbyState.players.forEach((player) => {
      // Don't show players who haven't selected their name yet
      const isCurrentPlayer = player.id === state.socket?.id;
      const hasSelectedName = player.status === 'ready' || player.status === 'host';

      // Skip rendering this player if they're the current user and haven't selected a name
      if (isCurrentPlayer && !hasSelectedName) {
        return; // Don't show the player at all until they select a name
      }

      const playerEl = document.createElement('div');
      playerEl.className = 'player-item';

      // Remove (You) from player name display
      let playerName = player.name;

      // Add player name first
      playerEl.textContent = playerName;

      // Add host badge if applicable
      if (player.id === lobbyState.hostId) {
        const hostBadge = document.createElement('span');
        hostBadge.textContent = 'Host';
        hostBadge.className = 'host-badge';
        hostBadge.setAttribute(
          'style',
          'font-size: 0.8em; font-weight: 600; margin-left: 8px; padding: 2px 6px; border-radius: 4px; background-color: rgba(0,0,0,0.1);'
        );

        // Clear the element and rebuild it with spans
        playerEl.textContent = '';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = playerName;
        nameSpan.className = 'player-name';
        playerEl.appendChild(nameSpan);
        playerEl.appendChild(hostBadge);
      } else {
        // Always wrap name in span for consistent styling
        playerEl.textContent = '';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = playerName;
        nameSpan.className = 'player-name';
        playerEl.appendChild(nameSpan);
      }

      this.playersContainer.appendChild(playerEl);
    });

    this.currentRoomId = lobbyState.roomId;

    const params = new URLSearchParams(window.location.search);
    if (params.get('room') !== lobbyState.roomId) {
      window.history.replaceState({}, '', `?room=${lobbyState.roomId}`);
    }

    const localPlayer = lobbyState.players.find((p) => p.id === state.myId);
    if (localPlayer && (localPlayer.status === 'host' || localPlayer.status === 'ready')) {
      this.guestNameInput.style.display = 'none';
      this.readyUpButton.style.display = 'none';
    } else {
      this.guestNameInput.style.display = '';
      this.readyUpButton.style.display = '';

      // Reset input field and ensure placeholder is set to match main lobby
      this.guestNameInput.value = '';
      this.guestNameInput.setAttribute('placeholder', "Who's playing today?");

      // Reset any form state that might be causing auto-population
      const form = this.guestNameInput.closest('form');
      if (form) form.reset();

      // Automatically focus the name input and highlight it for new players
      setTimeout(() => {
        if (this.guestNameInput) {
          this.guestNameInput.value = ''; // One more check to ensure it's empty
          this.guestNameInput.focus();
          this.guestNameInput.classList.add('highlight-input');
        }
      }, 100);
    }
  }
}

// Place this function OUTSIDE the class body:
export function setupInSessionLobbyModal(roomId: string): void {
  const modal = document.getElementById('in-session-lobby-modal');
  if (!modal) return;
  const copyLinkButton = document.getElementById('copy-link-button');
  const readyButton = document.getElementById('ready-up-button') as HTMLButtonElement;
  const nameInput = document.getElementById('guest-player-name-input') as HTMLInputElement;
  if (copyLinkButton) {
    // Replace the button with a clone of itself to remove any old event listeners
    const newCopyButton = copyLinkButton.cloneNode(true) as HTMLButtonElement;
    copyLinkButton.parentNode?.replaceChild(newCopyButton, copyLinkButton);
    // Add a new, correct event listener
    newCopyButton.addEventListener('click', () => {
      if (!roomId) {
        showToast('Room code is not available.', 'error');
        return;
      }
      const joinUrl = `${window.location.origin}?room=${roomId}`;
      navigator.clipboard
        .writeText(joinUrl)
        .then(() => {
          showToast('Join link copied to clipboard!', 'success');
          return undefined;
        })
        .catch(() => {
          showToast('Failed to copy link.', 'error');
          return undefined;
        });
    });
  }
  if (readyButton) {
    readyButton.addEventListener('click', () => {
      const playerName = nameInput?.value.trim();
      if (playerName) {
        import('../state.js')
          .then(({ socket }) => {
            socket?.emit(PLAYER_READY, playerName);
            return undefined;
          })
          .catch((err) => {
            console.error('Failed to emit PLAYER_READY:', err);
          });
        readyButton.disabled = true;
        if (nameInput) nameInput.disabled = true;
      } else {
        showToast('Please enter your name!', 'error');
      }
    });
  }
}
