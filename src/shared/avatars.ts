export interface AvatarItem {
  id: string;
  /**
   * Public URL for the avatar image.
   * Example: `/assets/new%20avatars/king_aldric.png`
   */
  icon: string;
  /**
   * Display name derived from filename.
   * Example: `King Aldric`
   */
  label: string;
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const LABEL_OVERRIDES: Record<string, string> = {
  // Kings
  'king_1.png': 'King Aldric',
  'king_2.png': 'King Magnus',
  'king_3.png': 'King Rowan',
  'king_4.png': 'King Theobald',

  // Knight (there is only one)
  'Knight_1.png': 'Sir Garrick',

  // Princes
  'Prince_1.png': 'Prince Tristan',
  'Prince_2.png': 'Prince Cassian',
  'Prince_3.png': 'Prince Dorian',
  'Prince_5.png': 'Prince Alaric',
  'prince_edmund.png': 'Prince Edmund',

  // Princesses
  'Princess_1.png': 'Princess Elowen',
  'Princess 5.png': 'Princess Isolde',
  'Princess_Sansa.png': 'Princess Sansa',

  // Queens
  'queen_amara.png': 'Queen Amara',
  'queen_linh.png': 'Queen Linh',
  'queen_seraphine.png': 'Queen Seraphine',
};

function labelFromFilename(fileName: string): string {
  const override = LABEL_OVERRIDES[fileName];
  if (override) return override;

  const base = fileName.replace(/\.[^.]+$/, '');
  return toTitleCase(base.replace(/[_-]+/g, ' '));
}

function assetUrl(fileName: string): string {
  // Use a hyphenated folder name for compatibility on static hosts.
  // Preserve filenames but URL-encode them to handle spaces/special characters.
  return `/assets/new-avatars/${encodeURIComponent(fileName)}`;
}

const AVATAR_FILES = [
  'king_1.png',
  'king_2.png',
  'king_3.png',
  'king_4.png',
  'Knight_1.png',
  'Prince_1.png',
  'Prince_2.png',
  'Prince_3.png',
  'Prince_5.png',
  'Princess_1.png',
  'Princess 5.png',
  'Princess_Sansa.png',
  'prince_edmund.png',
  'queen_amara.png',
  'queen_linh.png',
  'queen_seraphine.png',
];

export const ROYALTY_AVATARS: AvatarItem[] = AVATAR_FILES.map((fileName) => ({
  id: fileName.replace(/\.[^.]+$/, ''),
  icon: assetUrl(fileName),
  label: labelFromFilename(fileName),
}));

export function getRandomAvatar(
  excludedIds: Set<string> = new Set()
): AvatarItem {
  const pool = ROYALTY_AVATARS.filter((a) => !excludedIds.has(a.id));
  const source = pool.length > 0 ? pool : ROYALTY_AVATARS;
  return source[Math.floor(Math.random() * source.length)];
}
