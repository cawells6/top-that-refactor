export interface AvatarItem {
  id: string;
  icon: string;
  label: string;
}

export const ROYALTY_AVATARS: AvatarItem[] = [
  // The Court
  { id: 'king', icon: '🤴', label: 'King' },
  { id: 'queen', icon: '👸', label: 'Queen' },
  { id: 'guard', icon: '💂', label: 'Guard' },
  { id: 'fairy', icon: '🧚', label: 'Fairy' },
  { id: 'dragon', icon: '🐉', label: 'Dragon' },
  { id: 'genie', icon: '🧞', label: 'Genie' },
  { id: 'knight', icon: '🛡️', label: 'Knight' },
  { id: 'swords', icon: '⚔️', label: 'Duelist' },
  { id: 'crown', icon: '👑', label: 'Crown' },
  { id: 'castle', icon: '🏰', label: 'Castle' },
  { id: 'unicorn', icon: '🦄', label: 'Unicorn' }
];

export const CPU_NAMES = [
  "King Henry", "Queen Anne", "Prince John", "Lady Clara",
  "Sir Lancelot", "Duke William", "Baroness", "Count Olaf",
  "Jester Tom", "Wizard Merlin", "Guard Bob", "Empress"
];

export function getRandomAvatar(): AvatarItem {
  return ROYALTY_AVATARS[Math.floor(Math.random() * ROYALTY_AVATARS.length)];
}
