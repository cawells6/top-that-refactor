export interface AvatarItem {
  id: string;
  icon: string;
  label: string;
}

export const ROYALTY_AVATARS: AvatarItem[] = [
  // Royalty
  { id: 'king', icon: '🤴', label: 'King' },
  { id: 'queen', icon: '👸', label: 'Queen' },
  { id: 'prince', icon: '🫅', label: 'Prince' },
  { id: 'princess', icon: '💎', label: 'Gem' },

  // Court roles (no fairy/genie)
  { id: 'jester', icon: '🃏', label: 'Jester' },
  { id: 'herald', icon: '🎺', label: 'Herald' },
  { id: 'scribe', icon: '📜', label: 'Scribe' },
  { id: 'treasurer', icon: '💰', label: 'Treasurer' },
  { id: 'advisor', icon: '🦉', label: 'Advisor' },

  // Guards & arms
  { id: 'guard', icon: '💂', label: 'Guard' },
  { id: 'knight', icon: '🛡️', label: 'Knight' },
  { id: 'duelist', icon: '⚔️', label: 'Duelist' },
  { id: 'archer', icon: '🏹', label: 'Archer' },

  // Symbols & regalia
  { id: 'crown', icon: '👑', label: 'Crown' },
  { id: 'fleur', icon: '⚜️', label: 'Fleur-de-lis' },
  { id: 'ring', icon: '💍', label: 'Signet Ring' },
  { id: 'goblet', icon: '🏆', label: 'Trophy' },
  { id: 'key', icon: '🗝️', label: 'Old Key' },

  // Lands & beasts
  { id: 'castle', icon: '🏰', label: 'Castle' },
  { id: 'lion', icon: '🦁', label: 'Royal Beast' },

  // Mythical (still fits the "royal" vibe)
  { id: 'dragon', icon: '🐉', label: 'Dragon' },
  { id: 'unicorn', icon: '🦄', label: 'Unicorn' },
];

export const CPU_NAMES = [
  'King Henry',
  'Queen Anne',
  'Prince John',
  'Princess Clara',
  'Sir Lancelot',
  'Duke William',
  'Count Olaf',
  'Jester Tom',
  'Herald Hugh',
  'Scribe Simon',
  'Treasurer Tessa',
  'Guard Bob',
  'Advisor Ada',
];

export function getRandomAvatar(): AvatarItem {
  return ROYALTY_AVATARS[Math.floor(Math.random() * ROYALTY_AVATARS.length)];
}
