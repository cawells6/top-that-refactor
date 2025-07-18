# Outdated or Redundant Files (To Review or Remove)

This file tracks files and scripts in the codebase that are likely outdated, redundant, or candidates for removal/refactor. Review and clean up these files when the project is stable.

---

## Recently Removed (for reference)
- `public/scripts/position-fix.js` (removed)
- `public/scripts/layout-stabilizer.js` (removed)
- `public/scripts/simple-layout-stabilizer.js` (removed)
- `public/scripts/initial-layout-stabilizer.js` (removed)
- `public/scripts/lobby-position-fix.js` (removed)

## Candidates for Review

### 1. Legacy or Backup Scripts
- `public/scripts/events.ts.bak` – Backup, check if needed.
- `public/scripts/uiManager.ts.bak` – Backup, check if needed.
- `wait.js.archived` – Archived, check if needed.

### 2. Diagnostic/Debug Scripts
- `public/scripts/card-loader-diagnostic.js` – Used for diagnostics, remove if not needed.
- `public/scripts/force-card-update.js` – Used for troubleshooting, remove if not needed.
- `public/scripts/dom-inspector.js` – Used for DOM analysis, remove if not needed.
- `public/scripts/icon-viewer.js` – Used for icon viewing, remove if not needed.

### 3. Proposed Fixes/Notes
- `public/scripts/proposedfixes.md` – Review and migrate any actionable items.

### 4. Miscellaneous
- `public/scripts/debug-card-loader.js` – Debug tool, check if still needed.
- `public/scripts/init-card-loader.js` – Check if still referenced/needed.
- `public/scripts/trigger-cards-update.js` – Check if still referenced/needed.
- `public/scripts/rules-cards.js` – If `rules-cards.ts` is used, remove JS version if not needed.

### 5. Top-level Scripts
- `wait.js`, `wait-enhanced.js`, `wait.js.archived` – Review which are active/needed.
- `gpush.js`, `gpush.sh`, `gpush.bat` – Remove duplicates or unused variants.
- `clean-start.*` – Remove unused variants.

---

## How to Use This File
- When the project is stable, review each file above.
- Remove, archive, or refactor as appropriate.
- Update this file as you clean up the codebase.

---

**Tip:** Always check for references before deleting. Use `grep` or your IDE's search to confirm a file is not used.
