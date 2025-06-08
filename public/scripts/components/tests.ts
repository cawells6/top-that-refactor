// public/scripts/components/InSessionLobbyModal.ts
import { Modal } from './Modal.js';
import { LOBBY_STATE_UPDATE, START_GAME } from '../../../src/shared/events.js';
import { InSessionLobbyState } from '../../../src/shared/types.js';
import * as state from '../state.js';

export class InSessionLobbyModal {
  private modal: Modal;
  private roomId: string | null = null; // Store the current roomId

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
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'copy-game-id-btn') {
        this.copyRoomCode();
      }
      if (target.id === 'start-game-btn') {
        this.startGame();
      }
    });
  }

  private copyRoomCode(): void {
    const roomCodeEl = document.querySelector('.game-id') as HTMLElement;
    if (!roomCodeEl) return;

    const roomCode = roomCodeEl.textContent;
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      // Show a temporary "Copied!" message
      const copyButton = document.getElementById('copy-game-id-btn');
      if (copyButton) {
        const originalBtnText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('success');
        setTimeout(() => {
          copyButton.textContent = originalBtnText;
          copyButton.classList.remove('success');
        }, 2000);
      }
    }
  }

  private startGame(): void {
    if (!state.socket || !this.roomId) return;
    state.socket.emit(START_GAME, { roomId: this.roomId });
    this.hide();
  }

  public render(lobbyState: InSessionLobbyState): void {
    const gameIdEl = document.querySelector('.game-id');
    const playersContainer = document.getElementById('players-container');
    const startGameBtn = document.getElementById('start-game-btn');

    if (!gameIdEl || !playersContainer || !startGameBtn) return;

    // Set room code
    gameIdEl.textContent = lobbyState.roomId;
    this.roomId = lobbyState.roomId; // Store the latest roomId

    // Render players
    playersContainer.innerHTML = '';
    if (lobbyState.players.length === 0) {
      playersContainer.innerHTML = '<p class="no-players">No players have joined yet</p>';
    } else {
      lobbyState.players.forEach((player) => {
        const playerEl = document.createElement('div');
        playerEl.className = `player-item ${player.status}`;
        playerEl.innerHTML = `
          <span class="player-name">${player.name}</span>
          <span class="player-status">${player.status}</span>
        `;
        playersContainer.appendChild(playerEl);
      });
    }

    // Enable start button only for host
    const playerId = state.socket?.id;
    if (playerId === lobbyState.hostId) {
      startGameBtn.removeAttribute('disabled');
    } else {
      startGameBtn.setAttribute('disabled', 'disabled');
    }
  }

  public show(): void {
    this.modal.show();
  }

  public hide(): void {
    this.modal.hide();
  }
}
