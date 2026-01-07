export interface AvatarItem {
  id: string;
  icon: string;
  label: string;
}

export const ROYALTY_AVATARS: AvatarItem[] = [
  // The Court
  { id: 'king', icon: '🤴', label: 'King' },
  { id: 'queen', icon: '👸', label: 'Queen' },
  { id: 'prince', icon: '🤴', label: 'Prince' },
  { id: 'princess', icon: '👸', label: 'Princess' },
  { id: 'jester', icon: '🤡', label: 'Jester' },
  { id: 'guard', icon: '💂', label: 'Guard' },
  
  // Magic & Mystery
  { id: 'wizard', icon: '🧙', label: 'Wizard' },
  { id: 'fairy', icon: '🧚', label: 'Fairy' },
  { id: 'dragon', icon: '🐉', label: 'Dragon' },
  { id: 'genie', icon: '🧞', label: 'Genie' },
  
  // Combat & Items
  { id: 'knight', icon: '🛡️', label: 'Knight' },
  { id: 'swords', icon: '⚔️', label: 'Duelist' },
  { id: 'crown', icon: '👑', label: 'Crown' },
  { id: 'castle', icon: '🏰', label: 'Castle' },
  
  // Animals
  { id: 'lion', icon: '🦁', label: 'Lion' },
  { id: 'unicorn', icon: '🦄', label: 'Unicorn' },
  { id: 'eagle', icon: '🦅', label: 'Eagle' },
  { id: 'owl', icon: '🦉', label: 'Owl' }
];

export const CPU_NAMES = [
  "King Henry", "Queen Anne", "Prince John", "Lady Clara",
  "Sir Lancelot", "Duke William", "Baroness", "Count Olaf",
  "Jester Tom", "Wizard Merlin", "Guard Bob", "Empress"
];

export function getRandomAvatar(): AvatarItem {
  return ROYALTY_AVATARS[Math.floor(Math.random() * ROYALTY_AVATARS.length)];
}
