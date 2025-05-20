import { Server } from 'socket.io';
export default class GameController {
    private io;
    private gameState;
    private players;
    private socketIdToPlayerId;
    constructor(io: Server);
    private setupListeners;
    private getLobbyPlayerList;
    private handleRejoin;
    private handleJoin;
    private handleStartGame;
    private handlePlayCard;
    private handlePlayCardInternal;
    private handlePickUpPile;
    private handlePickUpPileInternal;
    private handleNextTurn;
    private playComputerTurn;
    private findBestPlayForComputer;
    private handleDisconnect;
    private pushState;
}
//# sourceMappingURL=GameController.d.ts.map