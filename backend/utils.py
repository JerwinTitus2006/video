import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple, List, Dict
import ffmpeg
from pydub import AudioSegment
import subprocess
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileUtils:
    """Utility functions for file operations"""
    
    ACCEPTED_AUDIO_FORMATS = {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'}
    ACCEPTED_VIDEO_FORMATS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
    
    @staticmethod
    def generate_job_id() -> str:
        """Generate unique job ID"""
        return str(uuid.uuid4())
    
    @staticmethod
    def ensure_directory(path: Path) -> None:
        """Ensure directory exists"""
        path.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def is_valid_media_file(filename: str) -> bool:
        """Check if file is valid audio/video format"""
        ext = Path(filename).suffix.lower()
        return ext in FileUtils.ACCEPTED_AUDIO_FORMATS or ext in FileUtils.ACCEPTED_VIDEO_FORMATS
    
    @staticmethod
    def extract_audio_from_video(video_path: Path, output_path: Path) -> Path:
        """Extract audio from video file"""
        try:
            # Use pydub for simple extraction
            video = AudioSegment.from_file(str(video_path))
            video.export(str(output_path), format="wav", parameters=["-ar", "16000", "-ac", "1"])
            logger.info(f"Audio extracted to {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            # Fallback to ffmpeg
            try:
                (
                    ffmpeg
                    .input(str(video_path))
                    .output(str(output_path), acodec='pcm_s16le', ar=16000, ac=1)
                    .overwrite_output()
                    .run(quiet=True)
                )
                return output_path
            except Exception as ffmpeg_error:
                logger.error(f"FFmpeg extraction failed: {ffmpeg_error}")
                raise
    
    @staticmethod
    def convert_audio(input_path: Path, output_path: Path) -> Path:
        """Convert audio to standard format (16kHz mono WAV)"""
        try:
            audio = AudioSegment.from_file(str(input_path))
            audio = audio.set_frame_rate(16000).set_channels(1)
            audio.export(str(output_path), format="wav")
            logger.info(f"Audio converted to {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error converting audio: {e}")
            raise
    
    @staticmethod
    def get_audio_duration(file_path: Path) -> float:
        """Get audio duration in seconds"""
        try:
            audio = AudioSegment.from_file(str(file_path))
            return len(audio) / 1000.0  # Convert ms to seconds
        except Exception as e:
            logger.error(f"Error getting audio duration: {e}")
            return 0.0


class TextProcessor:
    """Utility functions for text processing"""
    
    @staticmethod
    def format_timestamp(seconds: float) -> str:
        """Convert seconds to HH:MM:SS format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    @staticmethod
    def merge_transcript_diarization(transcript_segments: List[Dict], 
                                   diarization_segments: List[Dict]) -> List[Dict]:
        """Merge transcription and diarization results"""
        merged = []
        
        for trans_seg in transcript_segments:
            trans_start = trans_seg['start']
            trans_end = trans_seg['end']
            trans_text = trans_seg['text']
            
            # Find overlapping speaker segment
            speaker = "Unknown"
            max_overlap = 0
            
            for dia_seg in diarization_segments:
                dia_start = dia_seg['start']
                dia_end = dia_seg['end']
                
                # Calculate overlap
                overlap_start = max(trans_start, dia_start)
                overlap_end = min(trans_end, dia_end)
                overlap = max(0, overlap_end - overlap_start)
                
                if overlap > max_overlap:
                    max_overlap = overlap
                    speaker = dia_seg['speaker']
            
            merged.append({
                'start': trans_start,
                'end': trans_end,
                'speaker': speaker,
                'text': trans_text.strip(),
                'timestamp': TextProcessor.format_timestamp(trans_start)
            })
        
        return merged
    
    @staticmethod
    def extract_action_items(text: str) -> List[str]:
        """Extract potential action items from text"""
        action_keywords = [
            'action item', 'todo', 'to do', 'need to', 'should', 'must',
            'will do', 'follow up', 'next step', 'assign', 'responsible',
            'deadline', 'due', 'complete', 'finish', 'deliver'
        ]
        
        lines = text.split('\n')
        action_items = []
        
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in action_keywords):
                if len(line.strip()) > 10:  # Minimum length filter
                    action_items.append(line.strip())
        
        return action_items[:5]  # Return top 5 action items
    
    @staticmethod
    def extract_key_points(text: str) -> List[str]:
        """Extract key points from text"""
        sentences = text.split('. ')
        # Simple heuristic: longer sentences often contain key points
        key_sentences = [s for s in sentences if 50 < len(s) < 200]
        return key_sentences[:5]  # Return top 5 key points


class JobTracker:
    """Track job status and results"""
    
    def __init__(self):
        self.jobs = {}
    
    def create_job(self, job_id: str, filename: str) -> None:
        """Create new job entry"""
        self.jobs[job_id] = {
            'id': job_id,
            'filename': filename,
            'status': 'uploaded',
            'progress': 0,
            'result': None,
            'error': None,
            'created_at': None
        }
    
    def update_status(self, job_id: str, status: str, progress: int = None, error: str = None) -> None:
        """Update job status"""
        if job_id in self.jobs:
            self.jobs[job_id]['status'] = status
            if progress is not None:
                self.jobs[job_id]['progress'] = progress
            if error:
                self.jobs[job_id]['error'] = error
    
    def set_result(self, job_id: str, result: Dict) -> None:
        """Set job result"""
        if job_id in self.jobs:
            self.jobs[job_id]['result'] = result
            self.jobs[job_id]['status'] = 'completed'
            self.jobs[job_id]['progress'] = 100
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job information"""
        return self.jobs.get(job_id)


# Global job tracker instance
job_tracker = JobTracker()


class ConfigManager:
    """Configuration management"""
    
    @staticmethod
    def get_huggingface_token() -> Optional[str]:
        """Get HuggingFace token from environment"""
        return os.getenv('HUGGINGFACE_TOKEN')
    
    @staticmethod
    def get_model_cache_dir() -> Path:
        """Get model cache directory"""
        cache_dir = Path("models")
        cache_dir.mkdir(exist_ok=True)
        return cache_dir
    
    @staticmethod
    def get_output_dir() -> Path:
        """Get output directory"""
        output_dir = Path("outputs")
        output_dir.mkdir(exist_ok=True)
        return output_dir
    
    @staticmethod
    def get_data_dir() -> Path:
        """Get data directory"""
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)
        return data_dir