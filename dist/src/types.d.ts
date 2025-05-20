export interface Card {
    value: string | number;
    suit: string;
    back?: boolean;
    copied?: boolean;
}
export interface DealtCards {
    hands: Card[][];
    upCards: Card[][];
    downCards: Card[][];
}
//# sourceMappingURL=types.d.ts.map