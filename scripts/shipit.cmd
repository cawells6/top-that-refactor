@echo off
setlocal

REM Windows wrapper so VS Code action buttons can run ShipIt from PowerShell/CMD.
REM Passes all args through to the bash script.

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" (
  echo [shipit.cmd] ERROR: Git Bash not found at "%BASH%".
  echo Install Git for Windows or update scripts/shipit.cmd with the correct path.
  exit /b 1
)

REM Run from repo root so relative paths inside shipit.sh work reliably.
pushd "%~dp0\.."
"%BASH%" -lc "./scripts/shipit.sh %*"
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%

