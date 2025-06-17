@echo off
echo Running port cleanup before starting development servers...

REM Use the Node.js port cleanup script instead of direct taskkill
node scripts/port-cleanup.cjs cleanup

IF %ERRORLEVEL% NEQ 0 (
  echo WARNING: Port cleanup encountered issues, but continuing anyway
)

echo Starting development servers...
npm run dev:all
