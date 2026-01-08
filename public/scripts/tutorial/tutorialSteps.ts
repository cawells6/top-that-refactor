/**
 * Tutorial step configuration data
 */

export interface StepConfig {
  id: string;
  title: string;
  instruction: string;
  showNextButton?: boolean;
  isAuto?: boolean;
  scenario: {
    myHand: string[];
    pile: string[];
    upCards: string[];
    downCards: number; // count of face-down cards
  };
  validation: {
    type:
      | 'play_card'
      | 'pickup_pile'
      | 'facedown_fail'
      | 'facedown_pickup'
      | 'four_of_kind'
      | 'auto';
    expectedAction?: string;
    cardValue?: string;
    cardCount?: number;
  };
  allowSkip?: boolean;
}

export const tutorialSteps: StepConfig[] = [
  {
    id: 'INTRO_WELCOME',
    title: 'Welcome to Top That!',
    instruction:
      "Your only mission? One-up your opponent and become the king! This game is all about outplaying, outsmarting, and seizing the moment. Let's dive into the mechanics so you can start dueling in no time.<br><br><strong>Click anywhere when you're ready to continue!</strong>",
    scenario: {
      myHand: ['3H', '8D', 'QC'], // Start with 3 cards like real game
      pile: ['7S'], // Start with a card on the pile like real game
      upCards: ['JH', 'KD', '9S'], // Show up cards
      downCards: 3, // Show down cards
    },
    validation: {
      type: 'play_card', // Dummy validation - any click continues
    },
    allowSkip: false,
  },
  {
    id: 'HAND_BASIC',
    title: 'Playing from Your Hand',
    instruction:
      "First things first: get rid of all your cards to win. When the pile is empty, you can play anything. Perfect time to discard those low cards! Pro tip: play your weaker cards early so you're not stuck with them later forcing you to take the pile. <strong>Play your 3</strong> to commence your conquest!",
    scenario: {
      myHand: ['3H', '8D', 'QC'],
      pile: [],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'play_card',
      cardValue: '3',
    },
  },
  {
    id: 'OPPONENT_PLAYS_1',
    title: "Opponent's Turn",
    instruction:
      'The King just played a 7. Notice you still have 3 cards? After you play from your hand, you automatically draw back up to 3 cards (as long as the deck has cards left). This keeps the game moving!',
    isAuto: true,
    scenario: {
      myHand: ['8D', 'QC', '4S'], // Auto-drew 4S after playing 3
      pile: ['7S'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'auto',
    },
  },
  {
    id: 'HAND_HIGHER',
    title: 'Playing a Higher Card',
    instruction:
      "Here's the core rule: you must play higher than what's on the pile. The King played a 7, so you need an 8 or higher. <strong>Pro tip:</strong> Play the lowest card that works (your 8) to save your high cards (like that Queen) for when you really need them. Time to <strong>top that with your 8!</strong>",
    scenario: {
      myHand: ['8D', 'QC', '4S'], // Still have 3 cards
      pile: ['7S'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'play_card',
      cardValue: '8',
    },
  },
  {
    id: 'HAND_MULTIPLE',
    title: 'Playing Multiple Cards',
    instruction:
      'Got matching cards? Play them all at once for maximum impact! <strong>Click all three 6s to select them</strong>, then hit <strong>Play</strong> or double-click the last one. A powerful strategic move!',
    scenario: {
      myHand: ['6H', '6D', '6C'], // Drew two more 6s and lost the others
      pile: ['4D'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'play_card',
      cardValue: '6',
      cardCount: 3,
    },
  },
  {
    id: 'SPECIAL_TWO',
    title: 'Special Card: The Reset',
    instruction:
      'Stuck with low cards? The 2 is your royal pardon! It can be played on anything and resets the pile. <strong>Play your 2</strong> and seize control!',
    scenario: {
      myHand: ['2H', '8D', '4C'], // Now late game - deck is empty so no more auto-draws
      pile: ['KS'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '2',
    },
  },
  {
    id: 'SPECIAL_FIVE',
    title: 'Special Card: The Copycat',
    instruction:
      "The 5 is a shapeshifter. It copies whatever's on top of the pile! Right now there's a 2, so your 5 becomes a 2. A cunning tactic! <strong>Play your 5</strong> and watch it transform!<br><br><strong>Note:</strong> If the pile is empty, the 5 has nothing to copy and plays like a normal 5.",
    scenario: {
      myHand: ['5H', '3D', '7C'],
      pile: ['2S'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '5',
    },
  },
  {
    id: 'SPECIAL_TEN',
    title: 'Special Card: Burn the Pile',
    instruction:
      "The 10 is pure destruction. It burns the pile and those cards are removed from the game entirely! <strong>Unleash your 10</strong> and watch it all burn!<br><br><strong>Note:</strong> If a 10 starts a fresh pile, it won't burn anything.",
    scenario: {
      myHand: ['10H', '3D', '4S'],
      pile: ['9S', '9H'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '10',
    },
  },
  {
    id: 'PICKUP_FAIL',
    title: 'No Valid Play',
    instruction:
      "You're cornered! When you can't play anything, you must collect the pile. Even the greatest monarchs face setbacks. Click <strong>Take</strong> or click the pile to collect it.",
    scenario: {
      myHand: ['3H', '4D', '6C'],
      pile: ['KS', 'QH', 'JD'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'pickup_pile',
    },
  },
  {
    id: 'UPCARDS_INTRO',
    title: 'Up Cards: Phase 2',
    instruction:
      "Hand empty? No problem! Now you play from your visible 'up cards'. Everyone can see them, so choose wisely. You can only play one at a time though! <strong>Click your 7</strong> to play it.",
    scenario: {
      myHand: [],
      pile: ['3S'],
      upCards: ['7H', '9D', '4C'],
      downCards: 3, // Keep down cards visible for context
    },
    validation: {
      type: 'play_card',
      expectedAction: 'click_index_0', // First up card
    },
  },
  {
    id: 'UPCARDS_PICKUP_RULE',
    title: "Up Cards: If it's too low...",
    instruction:
      "When you play from your <strong>Up Cards</strong> (or later, your <strong>Down Cards</strong>), there's a key difference from your hand: if the card you try is <strong>too low</strong>, you don't just lose the turn — you must pick up the <strong>Draw pile</strong> plus <strong>the one card you tried to play</strong>.<br><br><strong>You do NOT pick up your other stack cards.</strong><br><br>To see it: <strong>click your 3</strong> (it's too low for the King).",
    scenario: {
      myHand: [],
      pile: ['KS'],
      upCards: ['6D', '7C', '3H'],
      downCards: 3,
    },
    validation: {
      type: 'play_card',
      expectedAction: 'click_index_2', // Third up card (the 3)
    },
  },
  {
    id: 'DOWNCARDS_INTRO',
    title: 'Down Cards: The Mystery Round',
    instruction:
      "Final phase! When your up cards are gone, it's time to flip face-down cards. The catch? You don't know what they are until you flip them! Could be an Ace, could be a 3... only one way to find out. <strong>Click a down card</strong> and test your fortune!",
    scenario: {
      myHand: [],
      pile: ['5S'],
      upCards: [],
      downCards: 3,
    },
    validation: {
      type: 'play_card',
      expectedAction: 'click_index_0', // First down card
    },
  },
  {
    id: 'FOUR_OF_KIND',
    title: 'The Ultimate Combo: Four of a Kind',
    instruction:
      "Here's the ultimate power move: play four matching cards at once and the entire pile explodes! This is your moment of glory. <strong>Select all four 7s and hit Play</strong>. Demonstrate your mastery!",
    scenario: {
      myHand: ['7D', '7H', '7C', '7S'],
      pile: ['KS'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'four_of_kind',
      cardValue: '7',
      cardCount: 4,
    },
  },
  {
    id: 'HELP_RULES_HISTORY',
    title: 'Need a refresher?',
    instruction:
      "If you ever forget a rule or want to see what just happened, use the two buttons in the <strong>top-left</strong>: <strong>Rules</strong> and <strong>Move History</strong>. Rules is your quick cheat-sheet, and Move History shows the most recent moves.",
    showNextButton: true,
    scenario: {
      myHand: [],
      pile: ['8D'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'auto',
    },
    allowSkip: false,
  },
  {
    id: 'COMPLETE',
    title: 'Ready to Claim Your Throne!',
    instruction:
      "Congratulations! You've mastered the basics. Now it's time to test your skills against worthy opponents. Think you can reign supreme? There's only one way to prove it. Click 'Finish' to begin your ascent to the throne!",
    scenario: {
      myHand: [],
      pile: [],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card', // Dummy - any click ends tutorial
    },
    showNextButton: true, // Keep for final step
    allowSkip: false,
  },
];
