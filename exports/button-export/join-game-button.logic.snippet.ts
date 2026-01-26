// Source: public/scripts/events.ts
// This is the code that wires + handles clicks for #join-enter-button in the app.

// ... inside init/boot code:
const joinEnterButton = document.getElementById('join-enter-button');
if (joinEnterButton) {
  joinEnterButton.addEventListener('click', handleJoinGameClick);
}

async function handleJoinGameClick() {
  clearMessageQueueAndHide();

  const joinBtn = document.getElementById(
    'join-enter-button'
  ) as HTMLButtonElement | null;
  if (joinBtn && joinBtn.disabled) return;

  const nameValidation = validateNameInput();
  const codeValidation = validateRoomCodeInput();

  let allValid = true;
  if (!nameValidation.isValid) {
    queueMessage(nameValidation.message);
    allValid = false;
  }
  if (!codeValidation.isValid) {
    queueMessage(codeValidation.message);
    allValid = false;
  }

  if (!allValid) {
    if (!nameValidation.isValid) uiManager.getNameInput()?.focus();
    if (joinBtn) joinBtn.disabled = false;
    return;
  }

  // ... emits JOIN_GAME and re-enables joinBtn in the callback
  if (joinBtn) joinBtn.disabled = true;
}
