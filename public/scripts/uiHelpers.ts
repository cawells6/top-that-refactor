// uiHelpers.ts
// Contains UI-related helper functions
import { $ } from './uiManager.js'; // getNameInput is also from uiManager, but $ is more generic
import { getNameInput } from './uiManager.js';

export function showGameOverMessage(didWin: boolean, winnerName: string): void {
  const over = document.createElement('div');
  over.id = 'game-over-container';
  over.innerHTML = `
    <div class="modal-content">
      <h1>Game Over!</h1>
      <p>${didWin ? '🎉 You win!' : `${winnerName} wins!`}</p>
      <button id="play-again-btn" class="btn btn-primary">Play Again</button>
    </div>`;
  document.body.appendChild(over);
  $('play-again-btn')?.addEventListener('click', () => location.reload());
}

export function validateName(): string | null {
  const nameInput = getNameInput();
  if (nameInput) {
    const name = nameInput.value.trim();
    if (name.length > 0 && name.length <= 20) {
      return name;
    }
  }
  alert('Please enter a name between 1 and 20 characters.');
  return null;
}
