// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, START_GAME } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import { Modal } from './Modal.js';
import * as state from '../state.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal {
  private modal: Modal;

  constructor() {
    const content = this.createContent();
    this.modal = new Modal(content, {
      id: 'in-session-lobby-modal',
      className: 'game-lobby-modal',
    });
    this.setupSocketListeners();
    this.addEventListeners();
  }

  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'in-session-lobby-container';
    container.innerHTML = `
        <h2>Game Lobby</h2>
        <div class="game-id-section">
            <p>Room Code: <strong class="game-id"></strong></p>
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
      const startGameBtn = document.getElementById('start-game-btn');

      copyBtn?.addEventListener('click', () => {
        const gameIdEl = document.querySelector('#in-session-lobby-modal .game-id');
        if (gameIdEl?.textContent) {
          navigator.clipboard.writeText(gameIdEl.textContent);
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
    const gameIdEl = document.querySelector('#in-session-lobby-modal .game-id');
    const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;

    if (!playersContainer || !gameIdEl || !startGameBtn) return;

    // Hide the lobby form but don't hide the lobby container itself
    uiManager.hideLobbyForm();

    // Set the room ID in the modal
    gameIdEl.textContent = lobbyState.roomId;
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
