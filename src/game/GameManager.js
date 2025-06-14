// GameManager.js

class GameManager {
  constructor() {
    this.games = {};
  }

  // In the method that creates a new game
  createGame(config) {
    console.log(`[GAME] Creating new game with config:`, config);
    const gameId = this.generateGameId();
    this.games[gameId] = {
      config: config,
      players: [],
      state: 'waiting'
    };
    
    console.log(`[GAME] Game created with ID: ${gameId}`);
    return gameId;
  }

  // In the method that adds a player to a game
  addPlayerToGame(gameId, playerInfo) {
    console.log(`[GAME] Adding player to game ${gameId}:`, playerInfo);
    const game = this.games[gameId];
    if (!game) {
      console.log(`[GAME] Game not found: ${gameId}`);
      return false;
    }

    game.players.push(playerInfo);
    const currentCount = game.players.length;
    const maxPlayers = game.config.maxPlayers;
    const isGameFull = currentCount >= maxPlayers;

    // After player is added
    console.log(`[GAME] Player added to game ${gameId}:`, {
      success: true,
      currentPlayerCount: currentCount,
      maxPlayers: maxPlayers,
      isGameFull: isGameFull
    });
    
    return true;
  }

  // In the method that starts a game
  startGame(gameId) {
    console.log(`[GAME] Attempting to start game ${gameId}`);
    const game = this.games[gameId];
    if (!game) {
      console.log(`[GAME] Game not found: ${gameId}`);
      return false;
    }

    game.state = 'started';
    const playerCount = game.players.length;
    const gameState = game.state;

    console.log(`[GAME] Game ${gameId} started successfully:`, {
      playerCount: playerCount,
      gameState: gameState
    });
    
    return true;
  }

  generateGameId() {
    // Logic to generate a unique game ID
  }
}

export default GameManager;