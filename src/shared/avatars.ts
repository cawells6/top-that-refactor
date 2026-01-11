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
  // removed: princess (gem)

  // Court roles (no fairy/genie)
  // removed: jester
  { id: 'herald', icon: '🎺', label: 'Herald' },
  { id: 'scribe', icon: '📜', label: 'Scribe' },
  { id: 'treasurer', icon: '💰', label: 'Treasurer' },
  // removed: advisor (owl)

  // Guards & arms
  { id: 'guard', icon: '💂', label: 'Guard' },
  { id: 'knight', icon: '🛡️', label: 'Knight' },
  { id: 'duelist', icon: '⚔️', label: 'Duelist' },
  { id: 'archer', icon: '🏹', label: 'Archer' },

  // Symbols & regalia
  { id: 'crown', icon: '👑', label: 'Crown' },
  // removed: fleur, ring, goblet (fleur-de-lis, signet ring, trophy)
  { id: 'key', icon: '🗝️', label: 'Old Key' },

  // Lands & beasts
  { id: 'castle', icon: '🏰', label: 'Castle' },
  // removed: lion

  // Mythical (still fits the "royal" vibe)
  { id: 'dragon', icon: '🐉', label: 'Dragon' },
  { id: 'unicorn', icon: '🦄', label: 'Unicorn' },
  // replacements for removed regalia/beasts
  { id: 'eagle', icon: '🦅', label: 'Royal Eagle' },
  { id: 'coin', icon: '🪙', label: 'Gold Coin' },
  { id: 'banner', icon: '🎌', label: 'Royal Banner' },
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
