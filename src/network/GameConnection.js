// GameConnection.js

class GameConnection {
  constructor() {
    this.connectionId = null;
    this.isConnected = false;
  }

  // In the connection method
  connect(gameDetails) {
    console.log(`[CONNECTION DEBUG] Initiating connection to game:`, gameDetails);
    
    // ...existing code...
    
    // Before sending connection request
    console.log(`[CONNECTION DEBUG] Sending connection payload:`, payload);
    
    // ...existing code...
    
    // After receiving response
    console.log(`[CONNECTION DEBUG] Connection response received:`, {
      success: isSuccess,
      error: error || 'none',
      connectionId: connectionId || 'none',
      timestamp: new Date().toISOString()
    });
    
    // ...existing code...
  }

  // In the data exchange method
  sendData(data) {
    console.log(`[CONNECTION DEBUG] Sending data to game:`, {
      type: data.type,
      size: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    // ...existing code...
  }

  // In the event listeners
  onDataReceived(data) {
    console.log(`[CONNECTION DEBUG] Received data from game:`, {
      type: data.type,
      size: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    // ...existing code...
  }

  // In the disconnect method
  disconnect() {
    console.log(`[CONNECTION DEBUG] Disconnecting from game, current state:`, {
      connectionId: this.connectionId,
      isConnected: this.isConnected,
      timestamp: new Date().toISOString()
    });
    
    // ...existing code...
  }
}

export default GameConnection;