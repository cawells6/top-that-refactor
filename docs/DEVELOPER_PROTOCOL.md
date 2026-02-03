# Top That! Developer Protocol

This document defines how we work (process, safety, verification) while refactoring Top That!.

- Architecture + immutable game rules: `docs/PROJECT_MANIFEST.md`
- Roadmap + priorities: `docs/ROADMAP_PROGRESS.md`

---

## Context

- Project: Top That! (real-time multiplayer card game)
- Stack: Node.js (server), Socket.io (comms), Vanilla TypeScript (client)
- Priority: stability over speed; refactor without breaking multiplayer timing/validation
- UX: don't re-introduce yourself each chat

## Non-Negotiables

- Authoritative server: game rules + turn order live on the server; the client renders `STATE_UPDATE` and emits requests.
- Protocol vs game rules:
  - Protocol violations (out-of-turn, invalid indices, acting during start/transition, client-forced outcomes): reject immediately (ERROR/ack fail).
  - Game rule violations (intended gameplay mistakes): do not reject; trigger pickup-penalty mechanic.
- Deterministic tests: any server randomness must be seedable/overrideable so Playwright runs are replayable (avoid flaky non-determinism).
- Per-player state updates: preserve personalized `STATE_UPDATE` delivery (do not broadcast private state room-wide).
- State safety: clone arrays/objects before broadcasting to clients to prevent reference mutation.
- Type safety: no new `any` (use `unknown` + narrowing).

---

## Workflow (Must Follow)

### 1) Safety / Branch / Scope

- Run `git branch --show-current`; if `main`, switch: `git checkout -b <feat|fix|chore>/<short-task>`.
- Declare a diff budget (expected files). If you need more, justify before editing.
- List at least 3 edge cases, including (when relevant):
  - 0 cards / empty pile / empty deck
  - reconnect/rejoin
  - latency/concurrency: two players act at the same time -> server serializes; one accepted, one rejected; state consistent
  - start/transition locks: actions during `isStarting` or turn transition are blocked consistently

### 2) Dependency Map (Before Proposing Code)

- Identify every entrypoint that can affect the behavior (file + function names).
- If a derived value is used in >1 place (counts/colors/coords/selectors), create ONE shared helper and update all callsites in the same change.

### 3) Repro + Evidence First

- Provide a minimal repro (steps or exact test command).
- Capture evidence (exact failing line(s), log excerpt, or screenshot).
- State 1-2 hypotheses and how you will falsify each.

### 4) Design Constraints

- Timing/async changes must document:
  - ordering assumptions (event A may arrive before event B)
  - idempotent "once" guards where needed
  - timeouts that fail fast with actionable logs
- Respect repo style: surgical edits; ESM imports with `.js` extensions; avoid rebuilding God files wholesale.

### 5) Implementation (Small, Testable Steps)

- Make the smallest possible change that proves the hypothesis.
- Don't change unrelated code.
- Prefer state-driven UI over static markers.

### 6) Verification Ladder (Required)

- Run the narrowest check first (smoke/integration preferred): server starts, can join game, can start a game.
- Then run relevant Playwright spec(s); for timing issues, repeat (`--repeat-each N`).
- Provide commands for both bash and PowerShell.
- Stop after 3 failed iterations: summarize what's known + next diagnostic step.

### 7) Acceptance Gate (Definition of Done)

- Restate 2-4 measurable "Done" invariants and confirm each is met.
- If turn/plays touched: include a concurrency invariant:
  - two clients attempt play simultaneously -> server accepts only current player; other gets protocol rejection; no duplicate events/desync
- Confirm state cloning is correct at broadcast boundaries.
- Confirm determinism: changes don't break seed-based replay in tests.
- Provide a rollback plan (what to revert if something regresses).

---

## Diagnostics (Use Before Guessing)

- Client debug logs: `localStorage.TOPTHAT_DEBUG = '1'`
- Timing diagnostics: `localStorage.DEBUG_TIMING = '1'` then `window.timingDiag.getReport()`
- Server logs: `TOPTHAT_VERBOSE=1` or `TOPTHAT_SERVER_LOGS=1`
- Startup lock tuning (if needed): `TOPTHAT_STARTUP_LOCK_MS`

---

## Response Template (Use For Each Roadmap Item)

`[TASK TITLE]` - Roadmap ID: `<from docs/ROADMAP_PROGRESS.md>`

0) Mission
- Objective:
- Architectural goal:
- Current failing behavior:
- Done invariants (measurable) + source of truth (server state / DOM / logs):

1) Safety / Scope
- Current branch:
- Planned branch name:
- Diff budget (files):
- Edge cases:

2) Dependency Map
- Entry points:

3) Repro + Evidence
- Repro command/steps:
- Evidence:
- Hypotheses + falsification plan:

4) Implementation Steps
- Step-by-step:

5) Verification
- Commands + what "pass" looks like:

6) Rollback
- How to revert safely:

