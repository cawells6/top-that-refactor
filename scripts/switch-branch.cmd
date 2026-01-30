@echo off
setlocal

REM Windows wrapper so VS Code action buttons can run switch-branch from PowerShell/CMD.

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" (
  echo [switch-branch.cmd] ERROR: Git Bash not found at "%BASH%".
  echo Install Git for Windows or update scripts/switch-branch.cmd with the correct path.
  exit /b 1
)

pushd "%~dp0\.."
"%BASH%" -lc "./scripts/switch-branch.sh %*"
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%

