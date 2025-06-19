@echo off
REM gpush.bat: Run gpush.sh from the scripts directory
REM Usage: gpush "Your commit message"

SET SCRIPT_DIR=%~dp0scripts
bash "%SCRIPT_DIR%/gpush.sh" %*
