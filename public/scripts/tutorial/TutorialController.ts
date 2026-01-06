// public/scripts/tutorial/TutorialController.ts

import { renderGameState } from '../render.js';
import { Card, GameStateData } from '../../../src/shared/types.js';
import { showToast } from '../uiHelpers.js';
import { initializeGameControls } from '../gameControls.js';

type TutorialStep = 
  | 'WELCOME' 
  | 'TEACH_BUTTON' 
  | 'TEACH_DBLCLICK' 
  | 'TEACH_MULTI'
  | 'TEACH_SPECIALS_COPY'
  | 'TEACH_SPECIALS_RESET'
  | 'TEACH_SPECIALS_BURN'
  | 'TEACH_TAKE'
  | 'VICTORY';

export class TutorialController {
  private step: TutorialStep = 'WELCOME';
  
  // RIGGED HAND: Perfect for the lessons
  private myHand: Card[] = [
    { value: 4, suit: 'hearts' }, 
    { value: 6, suit: 'clubs' },
    { value: 8, suit: 'diamonds' },
    { value: 8, suit: 'spades' }
  ];
  
  // RIGGED DECK: Cards intended to be drawn later
  private deckBuffer: Card[] = [
    { value: 2, suit: 'clubs' },     // Reset
    { value: 10, suit: 'hearts' },    // Burn
    { value: 5, suit: 'diamonds' }    // Copycat
  ];

  private pile: Card[] = [];
  private botHandCount = 10;
  
  // Dummy Table Cards (Just for show)
  private upCards: (Card | null)[] = [{ value: 'K', suit: 'spades' }, { value: 3, suit: 'hearts' }, { value: 'Q', suit: 'diamonds' }];
  private downCards: (Card | null)[] = [{ value: 2, suit: 'hearts', back: true }, { value: 3, suit: 'clubs', back: true }, { value: 4, suit: 'spades', back: true }];

  constructor() {
    this.createCoachUI();
    this.start();
    
    // Initialize controls with interceptors
    initializeGameControls();
    this.interceptGameControls();
  }

  private start() {
    this.updateRender();
    this.coachSay("Welcome to the Tutorial! I'm the King. Let's learn to play.");
    setTimeout(() => this.nextStep(), 2500);
  }

  private nextStep() {
    switch (this.step) {
      case 'WELCOME':
        this.step = 'TEACH_BUTTON';
        this.botPlay({ value: 3, suit: 'diamonds' });
        this.coachSay("Rule #1: Play HIGHER than the pile. Select the **4** and click **PLAY**.");
        break;
        
      case 'TEACH_BUTTON':
        this.step = 'TEACH_DBLCLICK';
        this.botPlay({ value: 4, suit: 'clubs' });
        this.coachSay("Too slow! Speed it up. **DOUBLE CLICK** the **6** to play instantly.");
        break;

      case 'TEACH_DBLCLICK':
        this.step = 'TEACH_MULTI';
        this.botPlay({ value: 7, suit: 'hearts' });
        this.coachSay("You have a pair of 8s! Select **BOTH** of them and play together.");
        break;

      case 'TEACH_MULTI':
        this.step = 'TEACH_SPECIALS_COPY';
        this.botPlay({ value: 'K', suit: 'clubs' }); // King is scary
        this.coachSay("A King?! Relax. The **5 is a Copycat**. It copies the card *below* it (the 8).");
        break;

      case 'TEACH_SPECIALS_COPY':
        this.step = 'TEACH_SPECIALS_RESET';
        this.botPlay({ value: 'A', suit: 'hearts' }); // Ace is scary
        this.coachSay("An Ace is the highest card. You can't beat it... so **RESET** it with a **2**!");
        break;

      case 'TEACH_SPECIALS_RESET':
        this.step = 'TEACH_SPECIALS_BURN';
        this.botPlay({ value: 9, suit: 'spades' });
        this.coachSay("Finish him! Play the **10** to **BURN** the pile completely.");
        break;
        
      case 'TEACH_SPECIALS_BURN':
        this.step = 'VICTORY';
        this.pile = []; 
        this.coachSay("You graduated! You're ready for the real deal.");
        setTimeout(() => {
           window.location.href = '/'; // Return to lobby
        }, 4000);
        break;
    }
  }

  // --- INTERCEPTED PLAY HANDLER ---
  private interceptGameControls() {
    // Intercept play button clicks
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        this.handlePlayerPlay('button');
      }, true);
    }

    // Intercept double-clicks on cards
    document.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.card-container')) {
        e.stopImmediatePropagation();
        this.handlePlayerPlay('dblclick');
      }
    }, true);
  }

  public handlePlayerPlay(source: 'button' | 'dblclick') {
    // Get selected cards
    const selectedElements = document.querySelectorAll('.card-img.selected');
    if (selectedElements.length === 0) {
      showToast('Select a card first!', 'error');
      return;
    }

    const selectedIndices: number[] = [];
    selectedElements.forEach(el => {
      const container = el.closest('.card-container') as HTMLElement;
      if (container) {
        const index = Array.from(container.parentElement?.children || []).indexOf(container);
        if (index >= 0) selectedIndices.push(index);
      }
    });

    const playedCards = selectedIndices.map(i => this.myHand[i]);

    // 1. LESSON VALIDATION
    if (this.step === 'TEACH_BUTTON' && source === 'dblclick') {
      this.coachSay("Not yet! Click the card, THEN the button. Learn the basics first!");
      return;
    }
    if (this.step === 'TEACH_DBLCLICK' && source === 'button') {
      this.coachSay("Too slow! **Double Click** the card.");
      return;
    }
    if (this.step === 'TEACH_MULTI' && playedCards.length < 2) {
      this.coachSay("Use your combo! Select **BOTH** 8s.");
      return;
    }

    // 2. EXECUTE PLAY
    // Clear selections
    selectedElements.forEach(el => el.classList.remove('selected'));
    
    // Sort indices desc to remove correctly
    selectedIndices.sort((a, b) => b - a).forEach(i => this.myHand.splice(i, 1));
    this.pile.push(...playedCards);
    
    // 3. AUTO-REFILL MAGIC
    if (this.myHand.length < 3 && this.deckBuffer.length > 0) {
      const newCard = this.deckBuffer.pop();
      if (newCard) {
        this.myHand.push(newCard);
        showToast(`Refilled hand with ${newCard.value} of ${newCard.suit}`, 'info');
      }
    }

    this.updateRender();
    setTimeout(() => this.nextStep(), 1500);
  }
  
  public handlePlayerTake() {
      // Logic for take lesson (if we add it)
  }

  // --- RENDERING & UTILS ---
  private botPlay(card: Card) {
    this.pile.push(card);
    this.updateRender();
  }

  private updateRender() {
    renderGameState({
      players: [
        { 
          id: 'me', 
          name: 'Recruit', 
          hand: this.myHand, 
          upCards: this.upCards as Card[],
          downCards: this.downCards as Card[],
          isComputer: false 
        },
        { 
          id: 'bot', 
          name: 'Drill Sergeant', 
          handCount: this.botHandCount, 
          upCards: [null, null, null] as any,
          downCards: [null, null, null] as any,
          isComputer: true 
        }
      ],
      pile: this.pile,
      started: true,
      currentPlayerId: 'me', // Always 'me' because we are scripting
      deckSize: this.deckBuffer.length,
      discardCount: 0,
      lastRealCard: null
    }, 'me');
  }
  
  private coachSay(msg: string) {
    let bubble = document.getElementById('coach-bubble');
    if (!bubble) {
        this.createCoachUI();
        bubble = document.getElementById('coach-bubble');
    }
    if(bubble) bubble.innerHTML = msg;
  }

  private createCoachUI() {
    const div = document.createElement('div');
    div.id = 'coach-overlay';
    div.innerHTML = `
      <div style="position: absolute; bottom: 180px; right: 20px; width: 280px; z-index: 2000; pointer-events: none;">
        <img src="/assets/Player.svg" style="width: 100px; float: right; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
        <div id="coach-bubble" style="background: white; padding: 15px; border-radius: 15px; border: 4px solid #333; float: right; margin-right: -20px; margin-top: 20px; font-family: 'Luckiest Guy', cursive; font-size: 1.2rem; box-shadow: 4px 4px 0px rgba(0,0,0,0.2); position: relative;">
          Ready for the tutorial?
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }
}
