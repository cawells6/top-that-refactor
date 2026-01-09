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
  private previousPlayers: Map<string, { name: string; isComputer?: boolean }> =
    new Map();
  private handleCopyLink = this.copyLink.bind(this);
  private handleReadyUp = this.readyUp.bind(this);

  constructor() {
    this.modalElement = document.getElementById('in-session-lobby-modal')!;
    if (!this.modalElement)
      throw new Error('InSessionLobbyModal element not found in the DOM.');

    this.playersContainer =
      this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.readyUpButton = this.modalElement.querySelector('#ready-up-button')!;
    this.guestNameInput = this.modalElement.querySelector(
      '#guest-player-name-input'
    )!;

    this.initialize();
  }

  private showModal(): void {
    this.modalElement.classList.remove('modal--hidden');
    this.modalElement.classList.remove('hidden');
  }

  private hideModal(): void {
    this.modalElement.classList.add('modal--hidden');
    this.modalElement.classList.add('hidden');
  }

  private async initialize(): Promise<void> {
    await state.socketReady;
    this.setupSocketListeners();
    this.addEventListeners();
  }

  private setupSocketListeners(): void {
    if (!state.socket) {
      console.error('[InSessionLobbyModal] Socket not available');
      uiManager.showError(
        'Unable to connect to game server. Please refresh the page.'
      );
      return;
    }

    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      console.log(
        '[InSessionLobbyModal] Received LOBBY_STATE_UPDATE:',
        lobbyState
      );
      this.render(lobbyState);
      const expectedHumans =
        typeof lobbyState.expectedHumanCount === 'number'
          ? lobbyState.expectedHumanCount
          : lobbyState.players.filter(
              (player) => !player.isComputer && !player.isSpectator
            ).length;
      const shouldShowModal = expectedHumans > 1;

      if (lobbyState.started) {
        console.log(
          '[InSessionLobbyModal] Game started, calling showGameTable()'
        );
        uiManager.showGameTable();
        this.hideModal();
        // Rendering is now handled by the STATE_UPDATE event
      } else if (shouldShowModal) {
        console.log('[InSessionLobbyModal] Game not started, showing modal');
        uiManager.hideElement(uiManager.getLobbyContainer());
        this.showModal();
      } else {
        this.hideModal();
      }
    });

    state.socket.on('disconnect', () => {
      console.warn('[InSessionLobbyModal] Socket disconnected');
      uiManager.showError('Connection lost. Please refresh.');
      this.readyUpButton.disabled = true;
      this.guestNameInput.disabled = true;
    });
  }

  private addEventListeners(): void {
    this.copyLinkBtn.addEventListener('click', this.handleCopyLink);
    this.readyUpButton.addEventListener('click', this.handleReadyUp);
  }

  private copyLink(): void {
    const roomId = this.currentRoomId || state.currentRoom || '';
    if (!roomId) {
      showToast('Room code not available yet.', 'error');
      return;
    }
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => showToast('Invite Link Copied!', 'success'))
      .catch(() => showToast('Failed to copy link.', 'error'));
  }

  private readyUp(): void {
    const playerName = this.guestNameInput.value.trim();
    if (playerName) {
      if (state.socket?.connected === false) {
        showToast('Not connected to server. Please try again.', 'error');
        return;
      }
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

    const gameCodeInput = this.modalElement.querySelector(
      '#game-id-input'
    ) as HTMLInputElement | null;
    if (gameCodeInput) {
      gameCodeInput.value = lobbyState.roomId.toUpperCase();
    }

    if (this.previousPlayers.size > 0) {
      this.previousPlayers.forEach((player, playerId) => {
        if (!lobbyState.players.some((p) => p.id === playerId)) {
          if (!player.isComputer) {
            const name = player.name?.trim() || 'A player';
            showToast(`${name} left the room.`, 'info');
          }
        }
      });
    }

    this.previousPlayers = new Map(
      lobbyState.players.map((player) => [
        player.id,
        { name: player.name, isComputer: player.isComputer },
      ])
    );

    this.playersContainer.innerHTML = '';
    this.playersContainer.setAttribute('role', 'list');
    this.playersContainer.setAttribute('aria-label', 'Players in lobby');

    lobbyState.players.forEach((player) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'player-item';
      playerEl.setAttribute('role', 'listitem');

      // Avatar element
      const avatarEl = document.createElement('div');
      avatarEl.className = 'player-avatar';

      if (player.avatar) {
        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'emoji-avatar';
        emojiDiv.textContent = player.avatar;
        avatarEl.appendChild(emojiDiv);
      } else {
        const img = document.createElement('img');
        img.src = player.isComputer
          ? '/assets/robot.svg'
          : '/assets/Player.svg';
        img.alt = 'avatar';
        avatarEl.appendChild(img);
      }

      // Name / label
      const labelWrap = document.createElement('div');
      labelWrap.className = 'player-meta';
      const nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.textContent =
        player.name + (player.id === state.myId ? ' (You)' : '');
      labelWrap.appendChild(nameEl);

      // Badges (spectator / host)
      if (player.isSpectator) {
        playerEl.classList.add('spectator');
        const spectatorBadge = document.createElement('span');
        spectatorBadge.textContent = 'Spectator';
        spectatorBadge.className = 'spectator-badge';
        spectatorBadge.setAttribute('aria-label', 'Spectator');
        labelWrap.appendChild(spectatorBadge);
      }

      if (player.id === lobbyState.hostId) {
        const hostBadge = document.createElement('span');
        hostBadge.textContent = 'Host';
        hostBadge.className = 'host-badge';
        hostBadge.setAttribute('aria-label', 'Host player');
        labelWrap.appendChild(hostBadge);
      }

      // Build player element: left side avatar + name, right side badges (kept in labelWrap)
      playerEl.appendChild(avatarEl);
      playerEl.appendChild(labelWrap);

      this.playersContainer.appendChild(playerEl);
    });

    const localPlayer = lobbyState.players.find((p) => p.id === state.myId);
    const hasKnownName =
      !!localPlayer?.name &&
      localPlayer.name.trim().length > 0 &&
      localPlayer.name.trim().toLowerCase() !== 'guest';

    if (
      localPlayer &&
      (localPlayer.status === 'host' ||
        localPlayer.status === 'ready' ||
        localPlayer.isSpectator)
    ) {
      this.guestNameInput.style.display = 'none';
      this.readyUpButton.style.display = 'none';
    } else {
      this.readyUpButton.style.display = '';
      this.readyUpButton.disabled = false;

      if (hasKnownName) {
        this.guestNameInput.value = localPlayer?.name || '';
        this.guestNameInput.style.display = 'none';
      } else {
        this.guestNameInput.style.display = '';
        this.guestNameInput.disabled = false;
        this.guestNameInput.value = '';
        this.guestNameInput.focus();
      }

      // Ensure the button is always all caps, even if text changes
      this.readyUpButton.textContent = this.readyUpButton.disabled
        ? 'STARTING...'
        : "LET'S PLAY";
      this.readyUpButton.textContent =
        this.readyUpButton.textContent.toUpperCase();
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
