@echo off
REM gnext.bat: Run gnext.sh from the scripts directory
REM Usage: gnext "Your commit message"

SET SCRIPT_DIR=%~dp0scripts
bash "%SCRIPT_DIR%/gnext.sh" %*
