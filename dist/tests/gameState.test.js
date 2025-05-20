// tests/gameState.test.ts
import GameState from '../models/GameState.js'; // Ensure this points to GameState.ts
describe('GameState', () => {
    let gs;
    beforeEach(() => {
        gs = new GameState();
    });
    test('initializes with default values', () => {
        expect(gs.players).toEqual([]);
        expect(gs.currentPlayerIndex).toBe(-1); // Changed from 0 to -1
        expect(gs.pile).toEqual([]);
        expect(gs.discard).toEqual([]);
        expect(gs.maxPlayers).toBe(4);
        // gs.playersCount was removed
        expect(gs.lastRealCard).toBeNull();
        expect(gs.deck).toBeNull(); // Changed from expect(gs.deck).toEqual([])
    });
    test('addPlayer adds a player ID and does not exceed maxPlayers', () => {
        gs.addPlayer('player1');
        expect(gs.players).toContain('player1');
        expect(gs.players.length).toBe(1);
        gs.addPlayer('player2');
        gs.addPlayer('player3');
        gs.addPlayer('player4');
        expect(gs.players.length).toBe(4);
        // Try to add a 5th player
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        gs.addPlayer('player5');
        expect(consoleWarnSpy).toHaveBeenCalledWith('Max players reached. Cannot add more players.');
        consoleWarnSpy.mockRestore();
        expect(gs.players.length).toBe(4); // Should still be 4 if maxPlayers is enforced
        expect(gs.players).not.toContain('player5');
    });
    describe('advancePlayer', () => {
        beforeEach(() => {
            gs.addPlayer('p1');
            gs.addPlayer('p2');
            gs.addPlayer('p3');
        });
        test('advances to the next player', () => {
            gs.advancePlayer();
            expect(gs.currentPlayerIndex).toBe(1);
        });
        test('wraps around to the first player', () => {
            gs.currentPlayerIndex = 2; // Last player (index for 3 players)
            gs.advancePlayer();
            expect(gs.currentPlayerIndex).toBe(0);
        });
        test('does nothing if no players', () => {
            const emptyGs = new GameState(); // New instance for this test
            emptyGs.advancePlayer();
            expect(emptyGs.currentPlayerIndex).toBe(-1); // Changed from 0 to -1
        });
    });
    describe('addToPile', () => {
        const card1 = { value: '7', suit: 'hearts' };
        const card2 = { value: 'K', suit: 'spades' };
        test('adds a card to the pile', () => {
            gs.addToPile(card1);
            expect(gs.pile).toContainEqual(card1);
        });
        test('adds a card as a copy if options.isCopy is true', () => {
            gs.addToPile(card2, { isCopy: true });
            expect(gs.pile).toContainEqual({ ...card2, copied: true });
        });
    });
    test('clearPile moves pile to discard and resets pile and lastRealCard', () => {
        const card1 = { value: 'A', suit: 'diamonds' };
        gs.addToPile(card1);
        gs.lastRealCard = card1;
        gs.clearPile();
        expect(gs.pile).toEqual([]);
        expect(gs.discard).toContainEqual(card1);
        expect(gs.lastRealCard).toBeNull();
    });
    describe('isFourOfAKindOnPile', () => {
        const createCard = (value, suit = 'hearts') => {
            return { value, suit };
        };
        test('returns true if top 4 cards have the same value property', () => {
            gs.addToPile(createCard('J'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            expect(gs.isFourOfAKindOnPile()).toBe(true);
        });
        test('returns false if less than 4 cards on pile', () => {
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            expect(gs.isFourOfAKindOnPile()).toBe(false);
        });
        test('returns false if top 4 are not four of a kind by value', () => {
            gs.addToPile(createCard('J'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('K'));
            gs.addToPile(createCard('7'));
            gs.addToPile(createCard('7'));
            expect(gs.isFourOfAKindOnPile()).toBe(false);
        });
        test('isFourOfAKindOnPile directly compares values, not normalized values', () => {
            gs.addToPile(createCard('2', 'hearts'));
            gs.addToPile(createCard(2, 'diamonds')); // number 2
            gs.addToPile(createCard('2', 'clubs'));
            gs.addToPile(createCard('2', 'spades'));
            expect(gs.isFourOfAKindOnPile()).toBe(false); // '2' !== 2
            gs.clearPile();
            gs.addToPile(createCard('A', 'hearts'));
            gs.addToPile(createCard('A', 'diamonds'));
            gs.addToPile(createCard('A', 'clubs'));
            gs.addToPile(createCard('A', 'spades'));
            expect(gs.isFourOfAKindOnPile()).toBe(true); // All are string 'A'
        });
    });
    // buildDeck and dealCards are tested separately in gameState.deck.test.js
});
