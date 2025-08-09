// ...existing code...

// After initializing your socket, e.g.:
const socket = io(); // or io('')

// Add these listeners for debugging
socket.on('connect', () => {
  console.log('[CLIENT] Socket connected:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('[CLIENT] Socket connection error:', err);
});
socket.on('error', (err) => {
  console.error('[CLIENT] Socket error:', err);
});

// In the handleDealClick function, after emitting JOIN_GAME
console.log('[CLIENT] JOIN_GAME event emitted, waiting for server response...');

// Add callback logging if there's a callback function
socket.emit('JOIN_GAME', gameData, (response) => {
  console.log('[CLIENT] Received JOIN_GAME response from server:', response);
  // ...existing code...
});

// Example client-side event handling patterns

// If using promises instead of callbacks
function handleJoinGameResponse() {
  // Example promise-based approach
  return new Promise((resolve, reject) => {
    // ... socket logic here ...
  })
    .then((response) => {
      console.log(
        '[CLIENT] JOIN_GAME promise resolved with response:',
        response
      );
      // ...existing code...
    })
    .catch((error) => {
      console.error('[CLIENT] JOIN_GAME error:', error);
      // ...existing code...
    });
}
