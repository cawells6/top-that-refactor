// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, PLAYER_READY } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import * as state from '../state.js';
import { showToast } from '../uiHelpers.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal {
  private modalElement: HTMLElement;
  private playersContainer: HTMLElement;
  private copyLinkBtn: HTMLButtonElement;
  private readyUpButton: HTMLButtonElement;
  private guestNameInput: HTMLInputElement;
  private currentRoomId: string = '';
  private handleCopyLink = this.copyLink.bind(this);
  private handleReadyUp = this.readyUp.bind(this);

  constructor() {
    this.modalElement = document.getElementById('in-session-lobby-modal')!;
    if (!this.modalElement) throw new Error('InSessionLobbyModal element not found in the DOM.');

    this.playersContainer = this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.readyUpButton = this.modalElement.querySelector('#ready-up-button')!;
    this.guestNameInput = this.modalElement.querySelector('#guest-player-name-input')!;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    await state.socketReady;
    this.setupSocketListeners();
    this.addEventListeners();
  }

  private setupSocketListeners(): void {
    if (!state.socket) {
      console.error('[InSessionLobbyModal] Socket not available');
      uiManager.showError('Unable to connect to game server. Please refresh the page.');
      return;
    }

    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      this.render(lobbyState);
      if (lobbyState.started) {
        uiManager.showGameTable();
      } else {
        uiManager.hideElement(uiManager.getLobbyContainer());
        uiManager.showElement(this.modalElement);
      }
    });

    state.socket.on('disconnect', () => {
      console.warn('[InSessionLobbyModal] Socket disconnected');
      uiManager.showError('Connection lost. Please refresh.');
    });
  }

  private addEventListeners(): void {
    this.copyLinkBtn.addEventListener('click', this.handleCopyLink);
    this.readyUpButton.addEventListener('click', this.handleReadyUp);
  }

  private copyLink(): void {
    const link = `${window.location.origin}?room=${this.currentRoomId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => showToast('Invite Link Copied!', 'success'))
      .catch(() => showToast('Failed to copy link.', 'error'));
  }

  private readyUp(): void {
    const playerName = this.guestNameInput.value.trim();
    if (playerName) {
      if (this.readyUpButton.disabled) return; // Prevent double emit
      console.log('[CLIENT] Emitting PLAYER_READY with', playerName);
      state.socket?.emit(PLAYER_READY, playerName);
      this.readyUpButton.disabled = true;
      this.guestNameInput.disabled = true;
    } else {
      showToast('Please enter your name!', 'error');
    }
  }

  public render(lobbyState: InSessionLobbyState): void {
    this.currentRoomId = lobbyState.roomId;

    // Update the session modal heading to be all caps
    const title = this.modalElement.querySelector('#in-session-lobby-title');
    if (title) {
      title.textContent = 'WAITING FOR PLAYERS...';
    }

    this.playersContainer.innerHTML = '';
    this.playersContainer.setAttribute('role', 'list');
    this.playersContainer.setAttribute('aria-label', 'Players in lobby');

    lobbyState.players.forEach((player) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'player-item';
      playerEl.setAttribute('role', 'listitem');
      playerEl.textContent = player.name + (player.id === state.myId ? ' (You)' : '');

      if (player.id === lobbyState.hostId) {
        const hostBadge = document.createElement('span');
        hostBadge.textContent = 'Host';
        hostBadge.className = 'host-badge';
        hostBadge.setAttribute('aria-label', 'Host player');
        playerEl.appendChild(hostBadge);
      }
      this.playersContainer.appendChild(playerEl);
    });

    const localPlayer = lobbyState.players.find((p) => p.id === state.myId);
    if (localPlayer && (localPlayer.status === 'host' || localPlayer.status === 'ready')) {
      this.guestNameInput.style.display = 'none';
      this.readyUpButton.style.display = 'none';
    } else {
      this.guestNameInput.style.display = '';
      this.readyUpButton.style.display = '';
      this.guestNameInput.disabled = false;
      this.readyUpButton.disabled = false;
      this.guestNameInput.focus();
      // Ensure the button is always all caps, even if text changes
      this.readyUpButton.textContent = this.readyUpButton.disabled ? 'STARTING...' : "LET'S PLAY";
      this.readyUpButton.textContent = this.readyUpButton.textContent.toUpperCase();
    }
  }

  public destroy(): void {
    if (state.socket) {
      state.socket.off(LOBBY_STATE_UPDATE);
      state.socket.off('disconnect');
    }
    this.copyLinkBtn.removeEventListener('click', this.handleCopyLink);
    this.readyUpButton.removeEventListener('click', this.handleReadyUp);
  }
}
