#!/usr/bin/env python3
"""
Simple FastAPI server for Whisper transcription only
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn
import tempfile
import os
import sys
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Set environment variables
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

app = FastAPI(
    title="Enhanced Meeting Transcriber",
    description="AI-powered transcription with Whisper large-v3",
    version="1.0.0"
)

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

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the main web interface"""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Meeting Transcriber</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667ee8 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 600px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        h1 {
            color: white;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .subtitle {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .upload-area {
            border: 2px dashed rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            padding: 40px;
            margin: 20px 0;
            background: rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
        }

        .upload-area:hover {
            border-color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.1);
        }

        .upload-icon {
            font-size: 3rem;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 20px;
        }

        .upload-text {
            color: white;
            font-size: 1.2rem;
            margin-bottom: 15px;
        }

        .supported-formats {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9rem;
        }

        input[type="file"] {
            display: none;
        }

        .upload-btn {
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
            min-width: 200px;
        }

        .upload-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .result-area {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            margin-top: 30px;
            text-align: left;
            display: none;
        }

        .result-title {
            color: white;
            font-size: 1.3rem;
            margin-bottom: 15px;
        }

        .transcript {
            background: rgba(0, 0, 0, 0.2);
            color: white;
            padding: 15px;
            border-radius: 10px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .loading {
            display: none;
            color: white;
            margin-top: 20px;
        }

        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 10px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }

        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feature h3 {
            color: white;
            margin-bottom: 8px;
        }

        .feature p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎤 Enhanced Transcriber</h1>
        <p class="subtitle">AI-powered speech-to-text with Whisper Large-v3</p>

        <div class="features">
            <div class="feature">
                <h3>🎙️ High Accuracy</h3>
                <p>Large-v3 model for superior transcription quality</p>
            </div>
            <div class="feature">
                <h3>🌍 Multi-language</h3>
                <p>Supports 99+ languages with automatic detection</p>
            </div>
            <div class="feature">
                <h3>⚡ Fast Processing</h3>
                <p>Optimized pipeline for quick results</p>
            </div>
        </div>

        <div class="upload-area" onclick="document.getElementById('fileInput').click()">
            <div class="upload-icon">📁</div>
            <div class="upload-text">Click to select audio file</div>
            <div class="supported-formats">
                Supports: MP3, WAV, FLAC, M4A, AAC, OGG<br>
                Video: MP4, AVI, MOV, MKV
            </div>
        </div>

        <input type="file" id="fileInput" accept="audio/*,video/*">
        <button class="upload-btn" onclick="uploadFile()">🚀 Transcribe Audio</button>

        <div class="loading">
            <div class="spinner"></div>
            <p>Processing audio... This may take a few moments.</p>
        </div>

        <div class="result-area" id="resultArea">
            <h3 class="result-title">📝 Transcription Result</h3>
            <div class="transcript" id="transcript"></div>
        </div>
    </div>

    <script>
        async function uploadFile() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select an audio file first!');
                return;
            }

            const loading = document.querySelector('.loading');
            const resultArea = document.getElementById('resultArea');
            const transcript = document.getElementById('transcript');
            
            loading.style.display = 'block';
            resultArea.style.display = 'none';

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                loading.style.display = 'none';
                
                if (response.ok) {
                    transcript.textContent = result.transcript || 'No speech detected in the audio.';
                    resultArea.style.display = 'block';
                    
                    // Show additional info if available
                    if (result.language) {
                        transcript.textContent += `\\n\\n📊 Details:\\n- Language: ${result.language}\\n- Duration: ${result.duration}s`;
                    }
                } else {
                    alert('Error: ' + (result.error || 'Transcription failed'));
                }
            } catch (error) {
                loading.style.display = 'none';
                alert('Error: ' + error.message);
            }
        }

        // File drag and drop
        const uploadArea = document.querySelector('.upload-area');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                document.getElementById('fileInput').files = files;
            }
        });
    </script>
</body>
</html>
    """
    return html_content

@app.post("/transcribe")
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