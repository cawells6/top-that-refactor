@echo off
REM go-branch.bat - Windows shortcut to run go-branch.sh
REM Usage: go-branch branch-name

if "%1"=="" (
  echo Error: No branch name provided
  echo Usage: go-branch branch-name
  exit /b 1
)

bash.exe "%~dp0go-branch.sh" %*
