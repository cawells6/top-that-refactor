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

function labelFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return toTitleCase(base.replace(/[_-]+/g, ' '));
}

function assetUrl(fileName: string): string {
  // Use a hyphenated folder name for compatibility on static hosts.
  return `/assets/new-avatars/${fileName}`;
}

// Use the processed transparent filenames by default where available.
const AVATAR_FILES = [
  'king_1_transparent_fade.png',
  'king_2_transparent_fade.png',
  'king_3_transparent_fade.png',
  'king_4_transparent_fade.png',
  'Knight_1_transparent_fade.png',
  'Prince_1_transparent_fade.png',
  'Prince_2_transparent_fade.png',
  'Prince_3_transparent_fade.png',
  'Prince_5_transparent_fade.png',
  'prince_edmund_transparent_fade.png',
  'Princess 5_transparent_fade.png',
  'Princess_1_transparent_fade.png',
  'Princess_Sansa_transparent_fade.png',
  'queen_amara_transparent_fade.png',
  'queen_linh_transparent_fade.png',
  'queen_seraphine_transparent_fade.png',
];

export const ROYALTY_AVATARS: AvatarItem[] = AVATAR_FILES.map((fileName) => ({
  id: fileName.replace(/\.[^.]+$/, '')
    .replace(/_transparent$/i, ''),
  icon: assetUrl(encodeURIComponent(fileName)),
  label: labelFromFilename(fileName.replace(/_transparent$/i, '')),
}));

export function getRandomAvatar(
  excludedIds: Set<string> = new Set()
): AvatarItem {
  const pool = ROYALTY_AVATARS.filter((a) => !excludedIds.has(a.id));
  const source = pool.length > 0 ? pool : ROYALTY_AVATARS;
  return source[Math.floor(Math.random() * source.length)];
}
