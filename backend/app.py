import logging
import os
import asyncio
from pathlib import Path
from typing import Optional, Dict, List
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import aiofiles
import json

# Import our modules
from utils import (
    FileUtils, TextProcessor, job_tracker, ConfigManager,
    JobTracker
)
from transcriber import transcription_engine, initialize_transcription_engine
from diarizer import diarization_engine, initialize_diarization_engine
from summarizer import meeting_summarizer, initialize_summarizer
from dataset_loader import initialize_datasets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Meeting AI Transcription Service",
    description="Advanced meeting transcription with speaker diarization and summarization",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (for frontend)
static_path = Path(__file__).parent.parent / "frontend"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Global variables
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = ConfigManager.get_output_dir()

@app.on_event("startup")
async def startup_event():
    """Initialize all AI models and services on startup"""
    logger.info("Starting Meeting AI Transcription Service...")
    
    # Create necessary directories
    UPLOAD_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    try:
        # Initialize datasets (optional, can run in background)
        logger.info("Initializing datasets...")
        asyncio.create_task(initialize_datasets())
        
        # Initialize transcription engine
        logger.info("Initializing transcription engine...")
        transcription_success = await initialize_transcription_engine("medium")
        
        if not transcription_success:
            logger.warning("Transcription engine failed to initialize")
        
        # Initialize diarization engine
        logger.info("Initializing diarization engine...")
        diarization_success = await initialize_diarization_engine()
        
        if not diarization_success:
            logger.warning("Diarization engine failed to initialize")
        
        # Initialize summarizer
        logger.info("Initializing summarizer...")
        summarizer_success = await initialize_summarizer()
        
        if not summarizer_success:
            logger.warning("Summarizer failed to initialize")
        
        logger.info("Meeting AI service startup completed")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")


@app.get("/")
async def root():
    """Serve the main frontend page"""
    frontend_file = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_file.exists():
        return FileResponse(str(frontend_file))
    return {"message": "Meeting AI Transcription Service", "status": "running"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "transcription_engine": transcription_engine.model is not None,
        "diarization_engine": diarization_engine.pipeline is not None,
        "summarizer": meeting_summarizer.model is not None
    }


@app.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: Optional[str] = None,
    min_speakers: Optional[int] = None,
    max_speakers: Optional[int] = None,
    summary_type: str = "comprehensive"
):
    """
    Upload and process meeting audio/video file
    
    Args:
        file: Audio or video file
        language: Language code for transcription (auto-detect if None)
        min_speakers: Minimum number of speakers for diarization
        max_speakers: Maximum number of speakers for diarization
        summary_type: Type of summary ('brief', 'comprehensive', 'detailed')
        
    Returns:
        Job ID for tracking processing status
    """
    try:
        # Validate file
        if not FileUtils.is_valid_media_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Supported: {FileUtils.ACCEPTED_AUDIO_FORMATS | FileUtils.ACCEPTED_VIDEO_FORMATS}"
            )
        
        if file.size > FileUtils.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {FileUtils.MAX_FILE_SIZE / (1024*1024*1024):.1f}GB"
            )
        
        # Generate job ID
        job_id = FileUtils.generate_job_id()
        
        # Save uploaded file
        file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create job entry
        job_tracker.create_job(job_id, file.filename)
        
        # Process file in background
        background_tasks.add_task(
            process_meeting_file,
            job_id,
            file_path,
            language,
            min_speakers,
            max_speakers,
            summary_type
        )
        
        logger.info(f"File uploaded and queued for processing: {job_id}")
        
        return {
            "job_id": job_id,
            "filename": file.filename,
            "status": "uploaded",
            "message": "File uploaded successfully and queued for processing"
        }
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get processing status and results for a job"""
    job_info = job_tracker.get_job(job_id)
    
    if not job_info:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_info


@app.get("/results/{job_id}")
async def get_job_results(job_id: str):
    """Get detailed results for a completed job"""
    job_info = job_tracker.get_job(job_id)
    
    if not job_info:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job_info["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Current status: {job_info['status']}")
    
    return job_info["result"]


@app.get("/download/{job_id}/{format}")
async def download_results(job_id: str, format: str):
    """Download results in specified format (json, txt, srt)"""
    job_info = job_tracker.get_job(job_id)
    
    if not job_info or job_info["status"] != "completed":
        raise HTTPException(status_code=404, detail="Job not found or not completed")
    
    result = job_info["result"]
    filename = f"{job_id}_results.{format}"
    file_path = OUTPUT_DIR / filename
    
    try:
        if format == "json":
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(json.dumps(result, indent=2))
            
        elif format == "txt":
            async with aiofiles.open(file_path, 'w') as f:
                content = generate_text_report(result)
                await f.write(content)
        
        elif format == "srt":
            async with aiofiles.open(file_path, 'w') as f:
                content = generate_srt_subtitles(result)
                await f.write(content)
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        return FileResponse(
            str(file_path),
            filename=filename,
            media_type="application/octet-stream"
        )
        
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_meeting_file(
    job_id: str,
    file_path: Path,
    language: Optional[str],
    min_speakers: Optional[int],
    max_speakers: Optional[int],
    summary_type: str
):
    """Background task to process meeting file"""
    try:
        logger.info(f"Starting processing for job {job_id}")
        
        # Update status
        job_tracker.update_status(job_id, "processing", 10)
        
        # Step 1: Convert audio if needed
        audio_path = await prepare_audio(file_path, job_id)
        job_tracker.update_status(job_id, "audio_prepared", 20)
        
        # Step 2: Transcribe audio
        logger.info(f"Transcribing audio for job {job_id}")
        transcript_result = transcription_engine.transcribe_audio(
            audio_path,
            language=language,
            word_timestamps=True,
            vad_filter=True
        )
        
        if transcript_result.get("status") != "success":
            raise Exception(f"Transcription failed: {transcript_result.get('error', 'Unknown error')}")
        
        job_tracker.update_status(job_id, "transcription_completed", 50)
        
        # Step 3: Perform speaker diarization
        logger.info(f"Performing speaker diarization for job {job_id}")
        diarization_result = diarization_engine.diarize_audio(
            audio_path,
            min_speakers=min_speakers,
            max_speakers=max_speakers
        )
        
        if diarization_result.get("status") != "success":
            logger.warning(f"Diarization failed: {diarization_result.get('error', 'Unknown error')}")
            diarization_result = {"segments": [], "speakers": []}
        
        job_tracker.update_status(job_id, "diarization_completed", 70)
        
        # Step 4: Merge transcription with diarization
        merged_segments = TextProcessor.merge_transcript_diarization(
            transcript_result["segments"],
            diarization_result.get("segments", [])
        )
        
        # Step 5: Generate summary
        logger.info(f"Generating summary for job {job_id}")
        full_transcript = transcript_result["full_text"]
        
        summary_result = meeting_summarizer.summarize_meeting(
            full_transcript,
            merged_segments,
            summary_type
        )
        
        if summary_result.get("status") != "success":
            logger.warning(f"Summarization failed: {summary_result.get('error', 'Unknown error')}")
            summary_result = {
                "main_summary": "Summary generation failed",
                "key_points": [],
                "action_items": []
            }
        
        job_tracker.update_status(job_id, "summarization_completed", 90)
        
        # Step 6: Compile final results
        final_result = {
            "transcript": {
                "full_text": full_transcript,
                "segments": merged_segments,
                "language": transcript_result.get("language", "unknown"),
                "duration": transcript_result.get("duration", 0),
                "word_count": transcript_result.get("word_count", 0)
            },
            "speakers": {
                "segments": diarization_result.get("segments", []),
                "speaker_list": diarization_result.get("speakers", []),
                "statistics": diarization_result.get("statistics", {})
            },
            "summary": {
                "main_summary": summary_result.get("main_summary", ""),
                "key_points": summary_result.get("key_points", []),
                "action_items": summary_result.get("action_items", []),
                "decisions": summary_result.get("decisions", []),
                "topics": summary_result.get("topics", []),
                "participant_summary": summary_result.get("participant_summary", {}),
                "metadata": summary_result.get("metadata", {})
            },
            "processing_info": {
                "job_id": job_id,
                "filename": job_tracker.get_job(job_id)["filename"],
                "processing_time": "N/A",  # Could calculate actual time
                "model_info": {
                    "transcription_model": transcription_engine.model_size,
                    "summarization_model": meeting_summarizer.model_name
                }
            }
        }
        
        # Save results
        job_tracker.set_result(job_id, final_result)
        
        # Cleanup temporary files
        try:
            if audio_path != file_path:
                audio_path.unlink()
            file_path.unlink()
        except:
            pass
        
        logger.info(f"Processing completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Processing error for job {job_id}: {e}")
        job_tracker.update_status(job_id, "failed", error=str(e))


async def prepare_audio(file_path: Path, job_id: str) -> Path:
    """Prepare audio file for processing"""
    file_ext = file_path.suffix.lower()
    
    # If already audio in correct format, return as-is
    if file_ext in ['.wav'] and await is_correct_audio_format(file_path):
        return file_path
    
    # Convert to WAV format
    audio_output = UPLOAD_DIR / f"{job_id}_audio.wav"
    
    try:
        if file_ext in FileUtils.ACCEPTED_VIDEO_FORMATS:
            # Extract audio from video
            FileUtils.extract_audio_from_video(file_path, audio_output)
        else:
            # Convert audio to standard format
            FileUtils.convert_audio(file_path, audio_output)
        
        return audio_output
        
    except Exception as e:
        logger.error(f"Audio preparation failed: {e}")
        raise


async def is_correct_audio_format(file_path: Path) -> bool:
    """Check if audio file is in correct format (16kHz, mono, WAV)"""
    try:
        import soundfile as sf
        info = sf.info(str(file_path))
        return info.samplerate == 16000 and info.channels == 1 and file_path.suffix.lower() == '.wav'
    except:
        return False


def generate_text_report(result: Dict) -> str:
    """Generate formatted text report"""
    report = []
    
    # Header
    report.append("MEETING TRANSCRIPTION REPORT")
    report.append("=" * 50)
    report.append("")
    
    # Summary
    summary = result.get("summary", {})
    report.append("MEETING SUMMARY")
    report.append("-" * 20)
    report.append(summary.get("main_summary", "No summary available"))
    report.append("")
    
    # Key Points
    key_points = summary.get("key_points", [])
    if key_points:
        report.append("KEY POINTS")
        report.append("-" * 20)
        for i, point in enumerate(key_points, 1):
            report.append(f"{i}. {point}")
        report.append("")
    
    # Action Items
    action_items = summary.get("action_items", [])
    if action_items:
        report.append("ACTION ITEMS")
        report.append("-" * 20)
        for i, item in enumerate(action_items, 1):
            if isinstance(item, dict):
                report.append(f"{i}. {item.get('task', item)}")
                if item.get('assignee') != 'Unassigned':
                    report.append(f"   Assigned to: {item.get('assignee', 'N/A')}")
                if item.get('deadline'):
                    report.append(f"   Deadline: {item.get('deadline', 'N/A')}")
            else:
                report.append(f"{i}. {item}")
        report.append("")
    
    # Full Transcript
    transcript = result.get("transcript", {})
    segments = transcript.get("segments", [])
    
    report.append("FULL TRANSCRIPT")
    report.append("-" * 20)
    
    for segment in segments:
        timestamp = segment.get("timestamp", "00:00:00")
        speaker = segment.get("speaker", "Unknown")
        text = segment.get("text", "")
        report.append(f"[{timestamp}] {speaker}: {text}")
    
    return "\n".join(report)


def generate_srt_subtitles(result: Dict) -> str:
    """Generate SRT subtitle format"""
    srt_lines = []
    
    transcript = result.get("transcript", {})
    segments = transcript.get("segments", [])
    
    for i, segment in enumerate(segments, 1):
        start_time = format_srt_time(segment.get("start", 0))
        end_time = format_srt_time(segment.get("end", 0))
        speaker = segment.get("speaker", "Unknown")
        text = segment.get("text", "")
        
        srt_lines.extend([
            str(i),
            f"{start_time} --> {end_time}",
            f"{speaker}: {text}",
            ""
        ])
    
    return "\n".join(srt_lines)


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time format (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


# Additional API endpoints for development and monitoring

@app.get("/models/info")
async def get_model_info():
    """Get information about loaded models"""
    return {
        "transcription": transcription_engine.get_model_info(),
        "diarization": diarization_engine.get_pipeline_info(),
        "summarization": {
            "model_name": meeting_summarizer.model_name,
            "device": str(meeting_summarizer.device),
            "is_loaded": meeting_summarizer.model is not None
        }
    }


@app.get("/jobs")
async def list_jobs():
    """List all jobs (for development)"""
    return {"jobs": list(job_tracker.jobs.keys())}


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )