// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, START_GAME } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import { Modal } from './Modal.js';
import * as state from '../state.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal extends Modal {
  private playersContainer: HTMLElement;
  private roomCodeInput: HTMLInputElement;
  private copyLinkBtn: HTMLButtonElement;
  private startGameBtn: HTMLButtonElement;

  constructor() {
    const modalElement = document.getElementById('in-session-lobby-modal');
    if (!modalElement) {
      throw new Error(
        'InSessionLobbyModal element not found in the DOM. Ensure it is present in index.html.'
      );
    }
    super(modalElement);

    this.playersContainer = this.modalElement.querySelector('#players-container')!;
    this.roomCodeInput = this.modalElement.querySelector('#lobby-room-code')!;
    // IDs updated to match main lobby styling
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.startGameBtn = this.modalElement.querySelector('#start-game-button')!;

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
      const link = `${window.location.origin}?room=${this.roomCodeInput.value}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          const originalText = this.copyLinkBtn.textContent;
          this.copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => {
            this.copyLinkBtn.textContent = originalText;
          }, 2000);
          return undefined;
        })
        .catch(() => {});
    });

    this.startGameBtn.addEventListener('click', () => {
      if (state.socket) state.socket.emit(START_GAME);
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
          const link = `${window.location.origin}?room=${this.roomCodeInput.value}`;
          try {
            await navigator.share({
              title: 'Join my Top That! game',
              text: `Join my game of Top That! The room code is ${this.roomCodeInput.value}`,
              url: link,
            });
          } catch {
            // Share was cancelled or failed.
          }
        });
        actionsRow.insertBefore(shareBtn, this.startGameBtn);
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
      playerEl.className = `player-item ${player.status.toLowerCase()}`;
      playerEl.innerHTML = `
        <span class="player-name">${player.name}${player.id === state.socket?.id ? ' (You)' : ''}</span>
        <span class="player-status">${player.status}</span>
      `;
      this.playersContainer.appendChild(playerEl);
    });

    this.roomCodeInput.value = lobbyState.roomId;

    const params = new URLSearchParams(window.location.search);
    if (params.get('room') !== lobbyState.roomId) {
      window.history.replaceState({}, '', `?room=${lobbyState.roomId}`);
    }
    this.startGameBtn.disabled = state.myId !== lobbyState.hostId;
  }
}
