#!/usr/bin/env python3
"""
Simple FastAPI server for Whisper transcription only
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
import sys
from pathlib import Path
import logging
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Set environment variables for model caching
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
models_dir = Path(__file__).parent / "models"
models_dir.mkdir(exist_ok=True)
os.environ["HF_HOME"] = str(models_dir.resolve())
os.environ["HF_HUB_CACHE"] = str(models_dir.resolve())

app = FastAPI(
    title="Enhanced Meeting Transcriber",
    description="AI-powered transcription with Whisper large-v3",
    version="1.0.0"
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job storage for async transcription
jobs = {}

# Global transcriber instance
transcriber = None

@app.on_event("startup")
async def startup_event():
    global transcriber
    try:
        logger.info("🚀 Initializing Enhanced Whisper Transcriber...")
        from transcriber import TranscriptionEngine
        
        transcriber = TranscriptionEngine()
        logger.info("✅ Enhanced transcriber ready!")
        logger.info(f"   Model: {transcriber.model_size}")
        logger.info(f"   Device: {transcriber.device}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize transcriber: {e}")
        raise

# Mount static files for frontend
frontend_path = Path(__file__).parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_path / "assets")), name="assets")

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the frontend"""
    frontend_index = Path(__file__).parent / "frontend" / "dist" / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    # Fallback to simple HTML if frontend not built
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Meeting Transcriber</title></head>
    <body>
        <h1>Meeting Transcriber API</h1>
        <p>Frontend not built. Run 'npm run build' in frontend folder.</p>
        <p>API endpoints available at /docs</p>
    </body>
    </html>
    """

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    if not transcriber:
        raise HTTPException(status_code=500, detail="Transcriber not initialized")
    
    try:
        logger.info(f"🎙️ Transcribing file: {file.filename}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Transcribe
            result = transcriber.transcribe_with_enhanced_pipeline(Path(temp_path))
            
            # Clean up
            os.unlink(temp_path)
            
            if "error" in result:
                raise HTTPException(status_code=500, detail=result["error"])
            
            response = {
                "transcript": result.get("full_text", ""),
                "language": result.get("language", "unknown"),
                "duration": result.get("duration", 0),
                "segments": len(result.get("segments", [])),
                "quality_score": result.get("quality_score", "N/A")
            }
            
            logger.info(f"✅ Transcription completed: {len(response['transcript'])} characters")
            return response
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "transcriber_ready": transcriber is not None,
        "model": transcriber.model_size if transcriber else "not loaded"
    }

@app.get("/api/health")
async def api_health_check():
    """API Health check endpoint"""
    return {
        "status": "healthy",
        "transcriber_ready": transcriber is not None,
        "model": transcriber.model_size if transcriber else "not loaded",
        "device": transcriber.device if transcriber else "unknown"
    }

@app.get("/api/info")
async def get_info():
    """Get server and model information"""
    return {
        "name": "Enhanced Meeting Transcriber",
        "version": "1.0.0",
        "model": transcriber.model_size if transcriber else "not loaded",
        "device": transcriber.device if transcriber else "unknown",
        "supported_formats": {
            "audio": [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"],
            "video": [".mp4", ".avi", ".mov", ".mkv", ".webm"]
        }
    }

# Keep legacy endpoint for backward compatibility
@app.post("/transcribe")
async def transcribe_audio_legacy(file: UploadFile = File(...)):
    """Legacy transcribe endpoint - redirects to /api/transcribe"""
    return await transcribe_audio(file)

if __name__ == "__main__":
    print("🚀 Starting Enhanced Meeting Transcriber")
    print("="*60)
    print("✅ Whisper Large-v3 model ready")  
    print("✅ Enhanced transcription pipeline")
    print("✅ Web interface with drag-and-drop")
    print("\n🌐 Starting server...")
    
    uvicorn.run(
        app,
        host="127.0.0.1", 
        port=8000,
        log_level="info"
    )