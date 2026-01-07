/**
 * Tutorial step configuration data
 */

export interface StepConfig {
  id: string;
  title: string;
  instruction: string;
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
      | 'four_of_kind';
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
    instruction: "Let's learn how to play. Click anywhere to continue.",
    scenario: {
      myHand: [],
      pile: [],
      upCards: [],
      downCards: 0,
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
      'You have a 3, 4, and 5. The pile shows a 2. Play your 3 by clicking it.',
    scenario: {
      myHand: ['3H', '4D', '5C'],
      pile: ['2S'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '3',
    },
  },
  {
    id: 'HAND_HIGHER',
    title: 'Playing Equal or Higher',
    instruction:
      'Now the pile shows 3. You can play 3 or higher. Play your 4.',
    scenario: {
      myHand: ['4D', '5C'],
      pile: ['3H'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '4',
    },
  },
  {
    id: 'HAND_MULTIPLE',
    title: 'Playing Multiple Cards',
    instruction:
      'You have three 6s! Double-click one to play all matching cards at once.',
    scenario: {
      myHand: ['6H', '6D', '6C'],
      pile: ['4D'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'play_card',
      cardValue: '6',
      cardCount: 3,
    },
  },
  {
    id: 'SPECIAL_TWO',
    title: 'Special Card: 2',
    instruction:
      'A 2 resets the pile - you can play anything after it. Play your 2.',
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
  },
  {
    id: 'SPECIAL_TEN',
    title: 'Special Card: 10',
    instruction:
      'A 10 burns the pile! Play your 10 to clear the pile and continue.',
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
  },
  {
    id: 'PICKUP_FAIL',
    title: 'No Valid Play? Pick Up the Pile',
    instruction:
      "You have 3 and 4, but the pile shows King. You can't play! Click the pile to pick it up.",
    scenario: {
      myHand: ['3H', '4D'],
      pile: ['KS', 'QH', 'JD'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'pickup_pile',
    },
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
  },
  {
    id: 'FACEDOWN_PICKUP',
    title: 'Picking Up After Failed Flip',
    instruction: 'Click the pile to pick it up along with your failed card.',
    scenario: {
      myHand: [],
      pile: ['8D', '3H'], // 3H is the failed face-down card
      upCards: [],
      downCards: 2,
    },
    validation: {
      type: 'facedown_pickup',
    },
  },
  {
    id: 'FOUR_OF_KIND',
    title: 'Four of a Kind Burns!',
    instruction:
      'Playing four cards of the same rank burns the pile, just like a 10! The pile has three 7s - play your 7 to complete the set.',
    scenario: {
      myHand: ['7D'],
      pile: ['7H', '7C', '7S'],
      upCards: [],
      downCards: 0,
    },
    validation: {
      type: 'four_of_kind',
      cardValue: '7',
    },
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
    allowSkip: false,
  },
];
