@echo off
:: Ultra-minimal development starter
:: No duplicate cleanup or verbose messages

:: Just run the script directly - with module flag to ensure it works
node --input-type=module .\run.js

:: Use the exit code from the script
exit /b %ERRORLEVEL%
