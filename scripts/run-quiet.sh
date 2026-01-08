#!/usr/bin/env bash
# scripts/run-quiet.sh
# Usage: ./scripts/run-quiet.sh <command> [args...]
# Runs the provided command and filters combined stdout/stderr
# to only show warning/error lines (case-insensitive).

set -o pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

# Build the command array
CMD=("$@")

# Execute the command and stream-filter output.
# We preserve the exit code of the command and print a summary at the end.

# Filter for common warning/error keywords and JS error types.
# Matches: warn, warning, error, TypeError, SyntaxError, ReferenceError, CRITICAL, Unhandled, Rejected, Traceback
"${CMD[@]}" 2>&1 | awk 'BEGIN{IGNORECASE=1}
/(^|[^A-Za-z0-9_])(warn|warning|error|typeerror|syntaxerror|referenceerror|critical|unhandled|rejected|traceback)([^A-Za-z0-9_]|$)/ {print; fflush()}
'

EXIT_CODE=${PIPESTATUS[0]}

# If no matches, optionally print nothing. We still print a short note on non-zero exit.
if [ $EXIT_CODE -ne 0 ]; then
  echo "[run-quiet] Command exited with code $EXIT_CODE" >&2
fi

exit $EXIT_CODE
