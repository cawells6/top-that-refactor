# Top That! — Copilot Instructions

Canonical standards live in `PROJECT_MANIFEST.md`. Follow it for all new/modified code.

## 🚨 NON-NEGOTIABLES (READ FIRST)

1.  **ALWAYS OPEN A NEW BRANCH.** Do not modify code on `main` or mix features.
    - Format: `feat/description` or `fix/description`.
2.  **TypeScript only.** Do not suggest switching to JS or disabling type checking.
3.  **Mobile-First.** Verify every UI change against a vertical mobile viewport.
4.  **No `any`.** Use `unknown` + narrowing if necessary.
5.  **Event names are constants.** Import from `src/shared/events.ts`.

## 🛑 SCOPE & SAFETY RULES

1.  **File Integrity:** Do not "rebuild" files like `main.ts`, `game-board.css`, or `GameController.ts` from scratch. Edit them surgically.
2.  **Scope Control:** One prompt = One goal. If a task affects both *Game Logic* and *UI Layout*, stop and ask to split the task.
3.  **Iteration Limit:** If a fix fails **3 times**, stop. Do not try a 4th "guess." Ask the user to revert to the last working commit.
4.  **Visual Lock:** The visual theme (Green felt, Gold accents) is **FROZEN**.
    * **Protocol:** If asked to change this, **ASK FIRST**: *"This changes the established theme. Are you sure?"* If yes, proceed.

