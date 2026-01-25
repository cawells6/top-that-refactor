# Top That! - Agent Instructions

Canonical standards live in `docs/PROJECT_MANIFEST.md`. Follow it for all new/modified code.

## Non-Negotiables

1. Always open a new branch. Do not modify code on `main` or mix features.
   - Format: `feat/description` or `fix/description`.
2. TypeScript only. Do not suggest switching to JS or disabling type checking.
3. Mobile-first. Verify every UI change against a vertical mobile viewport.
4. Avoid `any`. Use `unknown` + narrowing if necessary.
5. Event names are constants. Import from `src/shared/events.ts`.

## Scope And Safety

1. File integrity: Do not rebuild large files from scratch. Edit surgically.
2. Scope control: One prompt = one goal. If a task affects both game logic and UI layout, stop and ask to split it.
3. Iteration limit: If a fix fails 3 times, stop and ask to revert to the last working commit.
4. Visual lock: The theme (green felt, gold accents) is frozen. If asked to change it, ask for explicit confirmation first.

## Accuracy First

This repo values accuracy over speed. Take the time to understand the code path end-to-end before making changes, especially in the lobby and socket flows.

## Quick Type References

New code should converge toward these interfaces (source of truth is the codebase; these are reminders):

```ts
interface LobbyPlayer {
  id: string;
  name: string;
  avatar?: string;
  status: 'host' | 'invited' | 'joined' | 'ready';
  isComputer?: boolean;
  isSpectator?: boolean;
}

interface InSessionLobbyState {
  roomId: string;
  hostId: string | null;
  players: LobbyPlayer[];
  started?: boolean;
  expectedHumanCount?: number;
  expectedCpuCount?: number;
}
```
