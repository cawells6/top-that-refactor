@echo off
echo Running port cleanup before starting development servers...

REM Use kill-port for cross-platform cleanup
npx kill-port 3000 5173

IF %ERRORLEVEL% NEQ 0 (
  echo WARNING: Port cleanup encountered issues, but continuing anyway
)

echo Starting development servers...
npm run dev:all
