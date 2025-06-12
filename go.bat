@echo off
REM go.bat - Windows shortcut to run go script
REM Usage: go branch-name

if "%1"=="" (
  echo Error: No branch name provided
  echo Usage: go branch-name
  exit /b 1
)

bash.exe "%~dp0go" %*
