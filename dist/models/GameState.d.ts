export type CardValue = string | number;
export interface Card {
    value: CardValue;
    suit: string;
    copied?: boolean;
}
interface AddToPileOptions {
    isCopy?: boolean;
}
export default class GameState {
    players: string[];
    currentPlayerIndex: number;
    pile: Card[];
    discard: Card[];
    readonly maxPlayers: number;
    deck: Card[] | null;
    lastRealCard: Card | null;
    started: boolean;
    constructor();
    startGameInstance(): void;
    endGameInstance(): void;
    addPlayer(playerId: string): void;
    removePlayer(playerId: string): void;
    advancePlayer(): void;
    addToPile(card: Card, options?: AddToPileOptions): void;
    clearPile(): void;
    isFourOfAKindOnPile(): boolean;
    private buildDeck;
    dealCards(numPlayers: number, handSize?: number): {
        hands: Card[][];
        upCards: Card[][];
        downCards: Card[][];
    };
    isValidPlay(cards: Card[]): boolean;
}
export {};
//# sourceMappingURL=GameState.d.ts.map