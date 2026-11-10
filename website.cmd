@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" goto studio
if /i "%~1"=="edit" goto studio
set "SITE_NODE=%~dp0.website-studio\runtime\node.exe"
if exist "%SITE_NODE%" goto run
set "SITE_NODE=node"
where node >nul 2>&1
if errorlevel 1 set "SITE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if "%SITE_NODE%"=="node" goto run
if exist "%SITE_NODE%" goto run
echo Node.js was not found. Install Node.js 24 from https://nodejs.org/ and reopen this terminal.
pause
exit /b 1
:studio
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\studio\launch.ps1"
exit /b %errorlevel%
:run
"%SITE_NODE%" "%~dp0tools\manage.mjs" %*
exit /b %errorlevel%
