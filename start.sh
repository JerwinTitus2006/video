#!/bin/bash

# Meeting AI Startup Script
# This script helps set up and run the Meeting AI application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the meeting-ai root directory"
    exit 1
fi

print_status "Starting Meeting AI setup..."

# Check Python version
python_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    print_error "Python 3.8+ is required. Found: $python_version"
    exit 1
fi

print_success "Python version check passed: $python_version"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment found"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
print_status "Checking dependencies..."
cd backend

if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found in backend directory"
    exit 1
fi

# Install/update requirements
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
print_success "Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    if [ -f ".env.example" ]; then
        print_status "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file and add your HuggingFace token"
        print_warning "Get your token from: https://huggingface.co/settings/tokens"
        print_warning "Then run this script again"
        exit 1
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_success ".env file found"
fi

# Check for HuggingFace token
if ! grep -q "HUGGINGFACE_TOKEN=hf_" .env; then
    print_warning "HuggingFace token not configured properly in .env"
    print_warning "Please add your token: HUGGINGFACE_TOKEN=your_token_here"
    print_warning "Get your token from: https://huggingface.co/settings/tokens"
fi

# Check system dependencies
print_status "Checking system dependencies..."

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    print_error "FFmpeg not found. Please install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    exit 1
fi
print_success "FFmpeg found"

# Check CUDA (optional)
if command -v nvidia-smi &> /dev/null; then
    print_success "NVIDIA GPU detected"
    if python3 -c "import torch; print(torch.cuda.is_available())" 2>/dev/null | grep -q "True"; then
        print_success "CUDA support available"
    else
        print_warning "CUDA not available in PyTorch"
    fi
else
    print_status "No NVIDIA GPU detected (CPU mode will be used)"
fi

# Create necessary directories
print_status "Creating directories..."
mkdir -p ../models ../data ../outputs uploads
print_success "Directories created"

# Check disk space
available_space=$(df . | tail -1 | awk '{print $4}')
required_space=$((5 * 1024 * 1024)) # 5GB in KB

if [ "$available_space" -lt "$required_space" ]; then
    print_warning "Low disk space. At least 5GB recommended for AI models"
fi

print_success "Setup completed successfully!"
print_status "Starting Meeting AI server..."

# Start the server
echo ""
print_status "========================================"
print_status "  Meeting AI Server Starting"
print_status "========================================"
print_status "Backend: http://localhost:8000"
print_status "Frontend: http://localhost:8000"
print_status "API Docs: http://localhost:8000/docs"
print_status "========================================"
echo ""

# Run the application
python app.py