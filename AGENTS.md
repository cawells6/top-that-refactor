<INSTRUCTIONS>
## Branch policy (required)
- Never make changes on `main`.
- Before editing files, confirm the current branch is not `main` (`git branch --show-current`).
- If currently on `main`, create/switch to an appropriately named feature branch before any edits.

## Repo truth sources (required)
- Architecture and immutable rules: `docs/PROJECT_MANIFEST.md`
- Process and verification protocol: `docs/DEVELOPER_PROTOCOL.md`
- Current roadmap and priorities: `docs/ROADMAP_PROGRESS.md`
- Copilot guidance (editor-time): `.github/copilot-instructions.md`

## Engineering guardrails (required)
- Server is authoritative for rules/turn order; client renders state and emits requests only.
- Distinguish protocol violations (reject) vs game rule violations (pickup penalty).
- Preserve personalized `STATE_UPDATE` delivery (do not broadcast private state to the whole room).
- Avoid flaky tests: any server randomness must be seedable/overrideable for deterministic Playwright runs.
- Prefer surgical edits; avoid rebuilding large files from scratch.
- New code: TypeScript only, ESM imports with `.js`, and no new `any`.

## Build & runtime (required)
- `noEmit: true` — `tsc` only type-checks. Server runs from TS source via `tsx start-server.ts`, never from `dist/`.
- `npm run build` = type-check (`tsc -p tsconfig.build.json`) + client bundle (`vite build` → `dist/client/`).
- New server-side folders must be added to `tsconfig.build.json` `include` or build will fail with TS6307.
- Run `npx jest --no-coverage` and `npm run build` before writing tests or build scripts to know what's already broken.
</INSTRUCTIONS>
