@echo off
REM This batch file creates a temporary shell with the gpush alias loaded
REM Usage: Just run gpush.bat "Your commit message"

REM Get the directory where this batch file is
SET SCRIPT_DIR=%~dp0
REM Get the project directory (parent of script directory)
SET PROJECT_DIR=%SCRIPT_DIR%..

REM Pass all arguments to the gpush.sh script
bash "%SCRIPT_DIR%gpush.sh" %*
