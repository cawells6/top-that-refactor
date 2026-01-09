# Top That! — Copilot Instructions

Canonical standards live in `PROJECT_MANIFEST.md`. Follow it for all new/modified code.

## Non‑Negotiables

- **TypeScript only.** Do not suggest switching to JS or disabling type checking.
- **No `any` in new/modified code.** Use proper types or `unknown` + narrowing.
- **Respect layering.** UI must not call `socket.emit` directly; use the client application/wrapper utilities.
- **Event names are constants.** Import from `src/shared/events.ts` (never hardcode event strings).
- **ESM imports.** Repo is ESM; keep `.js` import extensions even from `.ts` sources (match existing patterns).
- **Vite asset hashing.** Import assets in TS; don’t hardcode `/assets/...` unless that exact asset already does so.
- **Mobile-first UI.** Any UI change must work on mobile and desktop.

## Architecture Map (Quick)

- **UI:** `public/scripts/*` (DOM events, validation, rendering). Entry: `public/scripts/main.ts`.
- **Client application layer:** wrapper/ack helpers in `public/scripts/*` (use these to send events).
- **Transport:** Socket.IO configured in `server.ts` and proxied by Vite in dev (`/socket.io`).
- **Server:** `controllers/GameController.ts` (game flow), `controllers/PlayerStateManager.ts` (sync/metrics).
- **Shared types/events:** `src/shared/*`.

## Debugging Workflow (Avoid “Frankenstein” Fixes)

- Expand search radius beyond the file you touched (CSS, config, state, import paths).
- Search repo for related patterns before coding (prefer `rg`).
- Prefer one clean fix over multiple layered workarounds.

## Tests & Validation

- Tests use **Jest + jsdom**. Mock the abstraction layer the code uses (e.g. mock ack utilities, not socket internals).
- Run `npm test` when behavior changes, and `npm run build` before larger refactors.

## Common Commands

- Dev (server+client): `npm run dev:all`
- Server only: `npm run dev:server`
- Tests: `npm test`
- Build: `npm run build`
- Prod run: `npm start`

## Reference Docs

- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/LAYERED_ARCHITECTURE.md`
- `PROJECT_MANIFEST.md`
