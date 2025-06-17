```javascript
// ...existing code...

// In the JOIN_GAME event handler
socket.on('JOIN_GAME', (data, callback) => {
  console.log(`[SERVER] Received JOIN_GAME request from client ${socket.id}:`, data);
  
  try {
    // ...existing code...
    
    // Log before creating/joining game
    console.log(`[SERVER] Attempting to create/join game with config:`, {
      name: data.name,
      numHumans: data.numHumans,
      numCPUs: data.numCPUs,
      socketId: socket.id
    });
    
    // ...existing code...
    
    // Log success response
    console.log(`[SERVER] Game joined successfully:`, {
      gameId: gameId, // Assuming there's a gameId variable
      players: currentPlayers, // Assuming there's a way to get current player count
      success: true
    });
    
    if (callback) {
      console.log(`[SERVER] Sending success response to client ${socket.id}`);
      callback({ success: true, gameId: gameId });
    }
  } catch (error) {
    console.error(`[SERVER] Error handling JOIN_GAME:`, error);
    if (callback) {
      console.log(`[SERVER] Sending error response to client ${socket.id}:`, error.message);
      callback({ success: false, error: error.message });
    }
  }
});
```