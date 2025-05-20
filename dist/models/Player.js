import { rank } from '../utils/cardUtils.js';
export default class Player {
    id;
    socketId;
    hand;
    upCards;
    downCards;
    name;
    isComputer;
    disconnected;
    constructor(id) {
        this.id = id;
        this.hand = [];
        this.upCards = [];
        this.downCards = [];
        this.name = '';
        this.isComputer = false;
        this.disconnected = false;
    }
    setHand(cards) {
        this.hand = [...cards];
        this.sortHand();
    }
    setUpCards(cards) {
        this.upCards = [...cards];
    }
    setDownCards(cards) {
        this.downCards = [...cards];
    }
    playFromHand(index) {
        if (index < 0 || index >= this.hand.length)
            return undefined;
        return this.hand.splice(index, 1)[0];
    }
    playUpCard(index) {
        if (index < 0 || index >= this.upCards.length)
            return undefined;
        return this.upCards.splice(index, 1)[0];
    }
    playDownCard() {
        if (this.downCards.length === 0)
            return undefined;
        return this.downCards.shift();
    }
    pickUpPile(pile) {
        this.hand.push(...pile);
        this.sortHand();
    }
    sortHand() {
        this.hand.sort((a, b) => rank(a) - rank(b));
    }
    hasEmptyHand() {
        return this.hand.length === 0;
    }
    hasEmptyUp() {
        return this.upCards.length === 0;
    }
    hasEmptyDown() {
        return this.downCards.length === 0;
    }
}
