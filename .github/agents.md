# Top That! - Agent Instructions

Canonical standards live in `docs/PROJECT_MANIFEST.md`.
Process + verification protocol lives in `docs/DEVELOPER_PROTOCOL.md`.
Follow them for all new/modified code.

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

## UI And CSS Discipline (Prevent "15 Attempt" Fixes)

When changing UI layout or styles, assume there are existing global rules and overrides.

1. Before editing CSS, search for all selectors that may affect the target element:
   - Look for the element id/class and any shared classes it uses (example: `.lobby-nav-button`, `.lobby-actions`).
   - Check for later rules in the same file that might override earlier rules (cascade order wins when specificity is equal).
2. Prefer matching existing patterns instead of inventing new ones:
   - If a button should look like Join/Host, reuse the same classes and `data-tab` styling hooks.
3. If you must override, do it deliberately:
   - Use a more specific selector (or `!important` as a last resort) and place it after the generic rule it overrides.
   - Avoid broad selectors that might leak to other tabs/panels.
4. Verify visually in both desktop and mobile:
   - Confirm grid/flex placement and hover/active states in all relevant lobby panels (Host / Join / Waiting).

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
