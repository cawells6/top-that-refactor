// tests/public/scripts/uiHelpers.test.ts
import { showGameOverMessage, validateName, showToast } from '../../../public/scripts/uiHelpers.js';

describe('uiHelpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('showGameOverMessage displays win message and attaches play again handler', () => {
    showGameOverMessage(true, 'Alice');
    const container = document.getElementById('game-over-container');
    expect(container).toBeTruthy();
    expect(container?.textContent).toMatch(/You win!/i);
    const playAgainBtn = document.getElementById('play-again-btn');
    expect(playAgainBtn).toBeTruthy();
  });

  it('showGameOverMessage displays loss message with winner name', () => {
    showGameOverMessage(false, 'Bob');
    const container = document.getElementById('game-over-container');
    expect(container).toBeTruthy();
    expect(container?.textContent).toMatch(/Bob wins!/i);
  });

  it('validateName returns name if valid', () => {
    const input = document.createElement('input');
    input.value = 'Chris';
    input.id = 'player-name-input';
    document.body.appendChild(input);
    expect(validateName()).toBe('Chris');
  });

  it('validateName returns null and alerts if name is invalid', () => {
    window.alert = jest.fn();
    const input = document.createElement('input');
    input.value = '';
    input.id = 'player-name-input';
    document.body.appendChild(input);
    expect(validateName()).toBeNull();
    expect(window.alert).toHaveBeenCalled();
  });

  it('showToast displays a toast and removes it after timeout', () => {
    jest.useFakeTimers();
    showToast('Test message', 'success');
    const toast = document.querySelector('.toast.toast--success');
    expect(toast).toBeTruthy();
    expect(toast?.textContent).toBe('Test message');
    jest.runAllTimers();
    expect(document.querySelector('.toast.toast--success')).toBeNull();
    jest.useRealTimers();
  });
});
