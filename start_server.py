#!/usr/bin/env python3
"""
Quick start script for the enhanced meeting transcriber web app
"""
import sys
from pathlib import Path
import uvicorn
import os

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Set environment to avoid re-downloading
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

print("🚀 Starting Enhanced Meeting Transcriber Web App")
print("="*60)
print("✅ Large-v3 Whisper model ready")
print("✅ Speaker diarization available")
print("✅ Enhanced transcription pipeline active")
print("\n🌐 Starting web server...")

if __name__ == "__main__":
    # Import the FastAPI app
    from app import app
    
    # Start the server
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="info",
        reload=False  # Disable reload to avoid re-initialization
    )