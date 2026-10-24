@echo off
setlocal
cd /d "%~dp0"
set "SITE_NODE=node"
where node >nul 2>&1
if errorlevel 1 set "SITE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if "%SITE_NODE%"=="node" goto run
if exist "%SITE_NODE%" goto run
echo Node.js was not found. Install Node.js 24 from https://nodejs.org/ and reopen this terminal.
exit /b 1
:run
"%SITE_NODE%" "%~dp0tools\manage.mjs" %*
exit /b %errorlevel%
