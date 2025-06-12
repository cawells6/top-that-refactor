export function isValidRoomId(roomId: string): boolean {
  if (typeof roomId !== 'string') return false;
  const trimmed = roomId.trim();
  return /^[A-Z0-9]{6}$/.test(trimmed);
}

export function isValidPlayerName(name: string): boolean {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 20;
}

export default {
  isValidRoomId,
  isValidPlayerName,
};
