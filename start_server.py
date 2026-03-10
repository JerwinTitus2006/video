#!/usr/bin/env python3
"""Start the AI Meet video-conferencing server"""
import sys
from pathlib import Path
import uvicorn
import os

backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

print("\n" + "=" * 50)
print("  AI Meet – Video Conferencing Server")
print("=" * 50)
print("  Backend : http://127.0.0.1:8000")
print("  Frontend: http://localhost:3000  (vite dev)")
print("=" * 50 + "\n")

if __name__ == "__main__":
    from app_meeting import socket_app
    uvicorn.run(socket_app, host="127.0.0.1", port=8000, log_level="info")