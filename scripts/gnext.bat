@echo off
REM gnext.bat: Commit, push, create next branch (e.g., 4.1 -> 4.2), switch, and delete previous branch
REM Usage: gnext.bat "Your commit message"

SET SCRIPT_DIR=%~dp0
bash "%SCRIPT_DIR%gnext.sh" %*
