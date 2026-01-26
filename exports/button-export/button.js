// Updates both visible and shadow text layers
function setPlayButtonLabel(label) {
  const button = document.getElementById('join-enter-button');
  if (!button) return;
  const main = button.querySelector('.text-main');
  const shadow = button.querySelector('.text-shadow');
  if (main) main.textContent = label;
  if (shadow) shadow.textContent = label;
}

// Example click handler wiring used in the app
function handleJoinGameClick(evt) {
  const nameInput = document.querySelector('#name-input');
  const name = nameInput?.value?.trim() || 'Player';
  // In the app, this triggers showLobbyForm / socket join
  console.log('Join clicked for', name);
}

document
  .getElementById('join-enter-button')
  ?.addEventListener('click', handleJoinGameClick);

// Export for dev console usage
window.setPlayButtonLabel = setPlayButtonLabel;

