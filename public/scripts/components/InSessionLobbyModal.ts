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
    // Add 'session-modal' class for targeted CSS
    this.modalElement.classList.add('session-modal');

    this.playersContainer = this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.readyUpButton = this.modalElement.querySelector('#ready-up-button')!;
    this.guestNameInput = this.modalElement.querySelector('#guest-player-name-input')!;

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
      const playerEl = document.createElement('div');
      // Use simplified pill style. Add 'host' class when applicable
      playerEl.className = `player-item${player.id === lobbyState.hostId ? ' host' : ''}`;
      playerEl.textContent = `${player.name}${player.id === state.socket?.id ? ' (You)' : ''}`;
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
      // Automatically focus the name input and highlight it for new players
      setTimeout(() => {
        if (this.guestNameInput) {
          this.guestNameInput.focus();
          this.guestNameInput.classList.add('highlight-input');
        }
      }, 100);
    }
  }
}

// Additional standalone script to handle copy link button functionality
const copyLinkButton = document.getElementById('copy-link-button') as HTMLButtonElement;
const lobbyRoomCodeInput = document.getElementById('lobby-room-code') as HTMLInputElement;

if (copyLinkButton && lobbyRoomCodeInput) {
  copyLinkButton.addEventListener('click', () => {
    const roomId = lobbyRoomCodeInput.value;
    if (roomId) {
      // Construct a full URL with the room ID as a query parameter
      const joinUrl = `${window.location.origin}?room=${roomId}`;

      navigator.clipboard
        .writeText(joinUrl)
        .then(() => {
          alert('Join link copied to clipboard!');
          return;
        })
        .catch((err) => {
          console.error('Failed to copy link: ', err);
          alert('Error copying link.');
        });
    }
  });
}

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

      // Construct the full shareable URL
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
        if (nameInput) {
          nameInput.disabled = true;
        }
      } else {
        showToast('Please enter your name!', 'error');
      }
    });
  }
}
