// Test mode for debugging special cards
export let isTestMode = false;
let continueResolve: (() => void) | null = null;

export function initializeManualMode(): void {
  const toggleButton = document.getElementById(
    'test-mode-toggle'
  ) as HTMLButtonElement;
  const overlay = document.getElementById(
    'test-mode-overlay'
  ) as HTMLDivElement;
  const continueButton = document.getElementById(
    'continue-button'
  ) as HTMLButtonElement;

  if (!toggleButton || !overlay || !continueButton) return;

  toggleButton.addEventListener('click', () => {
    isTestMode = !isTestMode;

    if (isTestMode) {
      toggleButton.textContent = '🔴 Test Mode Active';
      toggleButton.classList.add('active');
      console.log(
        '🔴 TEST MODE ENABLED - Game will pause after each special card'
      );
    } else {
      toggleButton.textContent = 'Enable Test Mode';
      toggleButton.classList.remove('active');
      overlay.style.display = 'none';
      console.log('⚪ Test mode disabled');

      // Release any pending continue
      if (continueResolve) {
        continueResolve();
        continueResolve = null;
      }
    }
  });

  continueButton.addEventListener('click', () => {
    console.log('▶️ Continue clicked - resuming game');
    overlay.style.display = 'none';
    if (continueResolve) {
      continueResolve();
      continueResolve = null;
    }
  });
}

export function waitForTestContinue(): Promise<void> {
  if (!isTestMode) {
    return Promise.resolve();
  }

  const overlay = document.getElementById('test-mode-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }

  console.log('⏸️ TEST MODE - Game paused, click Continue to proceed');

  return new Promise((resolve) => {
    continueResolve = resolve;
  });
}
