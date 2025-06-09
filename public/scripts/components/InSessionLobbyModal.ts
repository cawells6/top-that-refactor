// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, START_GAME } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import { Modal } from './Modal.js';
import * as state from '../state.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal extends Modal {
  constructor() {
    super(document.createElement('div'));
    this.createContent();
    this.addEventListeners();
    // Always append modal and backdrop to body if not present
    if (!document.body.contains(this.element)) {
      document.body.appendChild(this.element);
    }
    if (this.backdrop && !document.body.contains(this.backdrop)) {
      document.body.appendChild(this.backdrop);
    }
  }

  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'in-session-lobby-container';
    container.innerHTML = `
        <h2>Game Lobby</h2>
        <div class="game-id-section">
            <label for="lobby-room-code" class="visually-hidden">Room Code</label>
            <input id="lobby-room-code" class="game-id-input" type="text" readonly />
            <button id="copy-game-id-btn" class="btn">Copy</button>
        </div>
        <div class="players-list">
            <h3>Players</h3>
            <div id="players-container" class="players-container"></div>
        </div>
        <div class="lobby-actions">
          <button id="start-game-btn" class="btn primary full-width" disabled>Start Game</button>
        </div>
    `;
    return container;
  }

  private setupSocketListeners(): void {
    if (!state.socket) return;
    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      this.render(lobbyState);
    });
  }

  private addEventListeners(): void {
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-game-id-btn');

      copyBtn?.addEventListener('click', () => {
        const gameIdInput = document.getElementById('lobby-room-code') as HTMLInputElement | null;
        if (gameIdInput?.value) {
          navigator.clipboard.writeText(gameIdInput.value);
          if (copyBtn instanceof HTMLButtonElement) {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy';
            }, 2000);
          }
        }
      });

      startGameBtn?.addEventListener('click', () => {
        if (state.socket) state.socket.emit(START_GAME);
      });
    }, 0);
  }

  private render(lobbyState: InSessionLobbyState): void {
    const playersContainer = document.getElementById('players-container');
    const gameIdInput = document.getElementById('lobby-room-code') as HTMLInputElement | null;
    const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;

    if (!playersContainer || !gameIdInput || !startGameBtn) return;

    // Hide the lobby form but don't hide the lobby container itself
    uiManager.hideLobbyForm();

    // Set the room ID in the modal
    gameIdInput.value = lobbyState.roomId;
    playersContainer.innerHTML = '';

    // Render the player list
    lobbyState.players.forEach((player) => {
      const playerEl = document.createElement('div');
      const statusClass = player.status.toLowerCase();
      playerEl.className = `player-item ${statusClass}`;
      playerEl.innerHTML = `
          <span class="player-name">${player.name}${
            player.id === state.socket?.id ? ' (You)' : ''
          }</span>
          <span class="player-status">${player.status}</span>
      `;
      playersContainer.appendChild(playerEl);
    });

    // Only enable the start button for the host
    startGameBtn.disabled = state.myId !== lobbyState.hostId;

    // Show the modal (make it visible)
    console.log('📢 Showing in-session lobby modal for room:', lobbyState.roomId);
    this.modal.show();
  }
}
