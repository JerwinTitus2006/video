@echo off
setlocal enabledelayedexpansion

REM Meeting AI Startup Script for Windows
REM This script helps set up and run the Meeting AI application

title Meeting AI Startup

echo [INFO] Starting Meeting AI setup...

REM Check if we're in the right directory
if not exist "README.md" (
    echo [ERROR] Please run this script from the meeting-ai root directory
    pause
    exit /b 1
)
if not exist "backend" (
    echo [ERROR] Backend directory not found
    pause
    exit /b 1
)
if not exist "frontend" (
    echo [ERROR] Frontend directory not found
    pause
    exit /b 1
)

REM Check Python version
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Python not found. Please install Python 3.8+
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo [SUCCESS] Python version check passed: %python_version%

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [SUCCESS] Virtual environment created
) else (
    echo [SUCCESS] Virtual environment found
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
if !errorlevel! neq 0 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

REM Change to backend directory
cd backend

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found in backend directory
    pause
    exit /b 1
)

REM Install/update requirements
echo [INFO] Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed

REM Check for .env file
if not exist ".env" (
    echo [WARNING] .env file not found
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [WARNING] Please edit .env file and add your HuggingFace token
        echo [WARNING] Get your token from: https://huggingface.co/settings/tokens
        echo [WARNING] Then run this script again
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] .env file found
)

REM Check for HuggingFace token
findstr /c:"HUGGINGFACE_TOKEN=hf_" .env >nul 2>&1
if !errorlevel! neq 0 (
    echo [WARNING] HuggingFace token not configured properly in .env
    echo [WARNING] Please add your token: HUGGINGFACE_TOKEN=your_token_here
    echo [WARNING] Get your token from: https://huggingface.co/settings/tokens
)

REM Check system dependencies
echo [INFO] Checking system dependencies...

REM Check FFmpeg
ffmpeg -version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] FFmpeg not found. Please install FFmpeg:
    echo   Download from: https://ffmpeg.org/download.html
    echo   Or use chocolatey: choco install ffmpeg
    pause
    exit /b 1
)
echo [SUCCESS] FFmpeg found

REM Check CUDA (optional)
nvidia-smi >nul 2>&1
if !errorlevel! equ 0 (
    echo [SUCCESS] NVIDIA GPU detected
    python -c "import torch; print('CUDA available:' + str(torch.cuda.is_available()))" 2>nul
) else (
    echo [INFO] No NVIDIA GPU detected ^(CPU mode will be used^)
)

REM Create necessary directories
echo [INFO] Creating directories...
if not exist "..\models" mkdir "..\models"
if not exist "..\data" mkdir "..\data"
if not exist "..\outputs" mkdir "..\outputs"
if not exist "uploads" mkdir "uploads"
echo [SUCCESS] Directories created

echo [SUCCESS] Setup completed successfully!
echo [INFO] Starting Meeting AI server...

echo.
echo ========================================
echo   Meeting AI Server Starting
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.

REM Run the application
python app.py

pause