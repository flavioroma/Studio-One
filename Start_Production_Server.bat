@echo off
cd /d "%~dp0"
echo =========================================
echo  Starting Studio One Production Server 
echo =========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed!
    echo Please download and install it from https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check if dependencies are installed, install if missing
if not exist node_modules (
    echo No node_modules folder found. Installing dependencies...
    echo This might take a few minutes depending on your connection.
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo Error: Failed to install dependencies!
        pause
        exit /b
    )
    echo.
    echo Dependencies installed successfully.
    echo.
)

echo Building the project...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error: Failed to build the project!
    pause
    exit /b
)

echo.
echo Starting production preview server...
echo The app will automatically open in your default browser.
echo.
call npm run preview -- --open

pause
