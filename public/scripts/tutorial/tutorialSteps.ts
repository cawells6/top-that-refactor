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
    instruction: "Let's learn how to play. Click the Next button below to continue.",
    scenario: {
      myHand: ['3H', '8D', 'QC'], // Start with 3 cards like real game
      pile: [],
      upCards: ['JH', 'KD', '9S'], // Show up cards
      downCards: 3, // Show down cards
    },
    validation: {
      type: 'play_card', // Dummy validation - any click continues
    },
    showNextButton: true,
    allowSkip: false,
  },
  {
    id: 'HAND_BASIC',
    title: 'Playing from Your Hand',
    instruction:
      'The goal is to get rid of your cards. Let\'s start by playing a card from your hand. The pile is empty, so you can play anything. <strong>Play your 3.</strong>',
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
    showNextButton: true,
  },
  {
    id: 'OPPONENT_PLAYS_1',
    title: "Opponent's Turn",
    instruction: 'The King plays a 7.',
    isAuto: true,
    scenario: {
      myHand: ['8D', 'QC'],
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
      'The King played a 7. You must play a card with a higher rank. <strong>Select and play your 8.</strong>',
    scenario: {
      myHand: ['8D', 'QC'],
      pile: ['7S'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'play_card',
      cardValue: '8',
    },
    showNextButton: true,
  },
  {
    id: 'HAND_MULTIPLE',
    title: 'Playing Multiple Cards',
    instruction:
      'You can play multiple cards if they have the same rank. <strong>Click all three of your 6s to select them</strong>, then either click the <strong>Play</strong> button or double-click the last card to play them all.',
    scenario: {
      myHand: ['6H', '6D', '6C'],
      pile: ['4D'],
      upCards: ['JH', 'KD', '9S'], // Keep up cards visible
      downCards: 3, // Keep down cards visible
    },
    validation: {
      type: 'play_card',
      cardValue: '6',
      cardCount: 3,
    },
    showNextButton: true,
  },
  {
    id: 'SPECIAL_TWO',
    title: 'Special Card: 2',
    instruction:
      'A 2 is a special card that resets the pile. It can be played on any card. After a 2 is played, the next player can play any card. <strong>Play your 2.</strong>',
    scenario: {
      myHand: ['2H', '8D'],
      pile: ['KS'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '2',
    },
    showNextButton: true,
  },
  {
    id: 'SPECIAL_FIVE',
    title: 'Special Card: 5',
    instruction:
      'A 5 copies the last card played. The pile shows 2, so 5 also acts as 2. Play your 5.',
    scenario: {
      myHand: ['5H', '3D'],
      pile: ['2S'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '5',
    },
    showNextButton: true,
  },
  {
    id: 'SPECIAL_TEN',
    title: 'Special Card: 10',
    instruction:
      'A 10 is a special card that "burns" the pile, clearing it from play. After the pile is burned, the turn moves to the next player. <strong>Play your 10.</strong>',
    scenario: {
      myHand: ['10H', '3D'],
      pile: ['9S', '9H'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '10',
    },
    showNextButton: true,
  },
  {
    id: 'PICKUP_FAIL',
    title: 'No Valid Play? Pick Up the Pile',
    instruction:
      "You have no valid move! Click the <strong>Take</strong> button or click the pile itself to pick it up.",
    scenario: {
      myHand: ['3H', '4D'],
      pile: ['KS', 'QH', 'JD'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'pickup_pile',
    },
    showNextButton: true,
  },
  {
    id: 'UPCARDS_INTRO',
    title: 'Up Cards',
    instruction:
      "When your hand is empty, you play from visible 'up cards'. Click one to play it (you can only play one at a time).",
    scenario: {
      myHand: [],
      pile: ['3S'],
      upCards: ['7H', '9D', '4C'],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      expectedAction: 'click_index_0', // First up card
    },
    showNextButton: true,
  },
  {
    id: 'DOWNCARDS_INTRO',
    title: 'Down Cards',
    instruction:
      "When up cards are gone, you play face-down cards. You don't know what they are until you flip them! Click one.",
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
    showNextButton: true,
  },
  {
    id: 'FACEDOWN_FAIL',
    title: 'Face-Down Card Too Low',
    instruction:
      "You flipped a 3, but the pile shows 8. That's too low! You must pick up the pile (including the 3).",
    scenario: {
      myHand: [],
      pile: ['8D'],
      upCards: [],
      downCards: 2,
    },
    validation: {
      type: 'facedown_fail',
      expectedAction: 'pile_pickup_with_facedown',
    },
    showNextButton: true,
  },
  {
    id: 'FACEDOWN_PICKUP',
    title: 'Picking Up After Failed Flip',
    instruction:
      'Click the <strong>Take</strong> button or the pile itself to pick it up along with your failed card.',
    scenario: {
      myHand: [],
      pile: ['8D', '3H'], // 3H is the failed face-down card
      upCards: [],
      downCards: 2,
    },
    validation: {
      type: 'facedown_pickup',
    },
    showNextButton: true,
  },
  {
    id: 'FOUR_OF_KIND',
    title: 'Four of a Kind Burns the Pile',
    instruction:
      'If you play four cards of the same rank at once, it burns the pile! <strong>Select all four of your 7s and click Play</strong> to burn the pile.',
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
    showNextButton: true,
  },
  {
    id: 'COMPLETE',
    title: 'Tutorial Complete!',
    instruction:
      "Great job! You're ready to play. Click 'Finish' to return to the lobby.",
    scenario: {
      myHand: [],
      pile: [],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card', // Dummy - any click ends tutorial
    },
    showNextButton: true,
    allowSkip: false,
  },
];
