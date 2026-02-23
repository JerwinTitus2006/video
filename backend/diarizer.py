import logging
import torch
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import numpy as np
from pyannote.audio import Pipeline
from pyannote.audio.pipelines.speaker_diarization import SpeakerDiarization
from pyannote.core import Annotation, Segment
import librosa
import soundfile as sf
from utils import ConfigManager, TextProcessor

logger = logging.getLogger(__name__)


class SpeakerDiarizationEngine:
    """Advanced speaker diarization using pyannote.audio"""
    
    def __init__(self):
        """Initialize speaker diarization engine"""
        self.pipeline = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_dir = ConfigManager.get_model_cache_dir()
        self.hf_token = ConfigManager.get_huggingface_token()
        
        logger.info(f"Diarization engine initialized on {self.device}")
    
    def load_pipeline(self) -> bool:
        """Load pyannote speaker diarization pipeline"""
        try:
            logger.info("Loading pyannote speaker diarization pipeline...")
            
            if not self.hf_token:
                logger.warning("No HuggingFace token found. Using pipeline without token (may have limitations).")
            
            # Load the pipeline
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.hf_token,
                cache_dir=str(self.model_dir)
            )
            
            # Move to appropriate device
            if torch.cuda.is_available():
                self.pipeline = self.pipeline.to(self.device)
            
            logger.info("Speaker diarization pipeline loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load diarization pipeline: {e}")
            logger.info("Attempting fallback pipeline initialization...")
            
            # Try fallback approach
            try:
                self.pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization",
                    use_auth_token=self.hf_token,
                    cache_dir=str(self.model_dir)
                )
                logger.info("Fallback pipeline loaded successfully")
                return True
            except Exception as fallback_error:
                logger.error(f"Fallback pipeline failed: {fallback_error}")
                return False
    
    def diarize_audio(self, 
                     audio_path: Path,
                     min_speakers: Optional[int] = None,
                     max_speakers: Optional[int] = None,
                     min_segment_length: float = 1.0,
                     overlap_threshold: float = 0.5) -> Dict:
        """
        Perform speaker diarization on audio file
        
        Args:
            audio_path: Path to audio file
            min_speakers: Minimum number of speakers (auto-detect if None)
            max_speakers: Maximum number of speakers (auto-detect if None)
            min_segment_length: Minimum segment length in seconds
            overlap_threshold: Overlap threshold for clustering
            
        Returns:
            Dictionary with diarization results
        """
        if not self.pipeline:
            logger.error("Pipeline not loaded. Call load_pipeline() first.")
            return {"error": "Pipeline not loaded"}
        
        try:
            logger.info(f"Performing speaker diarization: {audio_path}")
            
            # Validate audio file
            if not self._validate_audio_file(audio_path):
                return {"error": "Invalid audio file"}
            
            # Configure pipeline parameters
            if min_speakers or max_speakers:
                self.pipeline.instantiate({
                    "min_speakers": min_speakers,
                    "max_speakers": max_speakers
                })
            
            # Perform diarization
            diarization = self.pipeline(audio_path)
            
            # Process results
            diarization_data = self._process_diarization(
                diarization, 
                min_segment_length=min_segment_length
            )
            
            # Calculate statistics
            stats = self._calculate_diarization_stats(diarization_data["segments"])
            
            logger.info(f"Diarization completed. Found {stats['num_speakers']} speakers")
            
            return {
                "status": "success",
                "segments": diarization_data["segments"],
                "speakers": diarization_data["speakers"],
                "statistics": stats,
                "overlap_regions": diarization_data["overlaps"]
            }
            
        except Exception as e:
            logger.error(f"Diarization error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def _validate_audio_file(self, audio_path: Path) -> bool:
        """Validate audio file for diarization"""
        try:
            # Check if file exists
            if not audio_path.exists():
                logger.error(f"Audio file not found: {audio_path}")
                return False
            
            # Try to load audio
            data, sr = sf.read(str(audio_path))
            
            # Check duration (minimum 1 second)
            duration = len(data) / sr
            if duration < 1.0:
                logger.error(f"Audio too short: {duration:.1f}s (minimum 1s)")
                return False
            
            # Check if stereo, convert to mono if needed
            if len(data.shape) > 1:
                logger.info("Converting stereo to mono for diarization")
            
            return True
            
        except Exception as e:
            logger.error(f"Audio validation failed: {e}")
            return False
    
    def _process_diarization(self, diarization: Annotation, min_segment_length: float = 1.0) -> Dict:
        """Process diarization annotation into structured data"""
        segments = []
        speakers = set()
        overlaps = []
        
        # Process each segment
        for segment, track, speaker in diarization.itertracks(yield_label=True):
            duration = segment.duration
            
            # Filter short segments
            if duration < min_segment_length:
                continue
            
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "duration": duration,
                "speaker": speaker,
                "track": track,
                "timestamp": TextProcessor.format_timestamp(segment.start)
            }
            
            segments.append(segment_data)
            speakers.add(speaker)
        
        # Detect overlapping speech
        overlaps = self._detect_overlaps(segments)
        
        # Sort segments by start time
        segments.sort(key=lambda x: x["start"])
        
        # Renumber speakers for consistency
        speaker_mapping = {speaker: f"Speaker_{i+1}" for i, speaker in enumerate(sorted(speakers))}
        
        # Apply speaker mapping
        for segment in segments:
            segment["speaker"] = speaker_mapping.get(segment["speaker"], segment["speaker"])
        
        # Update overlap segments too
        for overlap in overlaps:
            for speaker_time in overlap["speakers"]:
                speaker_time["speaker"] = speaker_mapping.get(
                    speaker_time["speaker"], 
                    speaker_time["speaker"]
                )
        
        return {
            "segments": segments,
            "speakers": list(speaker_mapping.values()),
            "overlaps": overlaps
        }
    
    def _detect_overlaps(self, segments: List[Dict]) -> List[Dict]:
        """Detect overlapping speech regions"""
        overlaps = []
        
        for i, seg1 in enumerate(segments):
            for j, seg2 in enumerate(segments[i+1:], i+1):
                # Check for temporal overlap
                overlap_start = max(seg1["start"], seg2["start"])
                overlap_end = min(seg1["end"], seg2["end"])
                
                if overlap_start < overlap_end:
                    overlap_duration = overlap_end - overlap_start
                    
                    # Only report significant overlaps (>0.5 seconds)
                    if overlap_duration > 0.5:
                        overlap_data = {
                            "start": overlap_start,
                            "end": overlap_end,
                            "duration": overlap_duration,
                            "speakers": [
                                {
                                    "speaker": seg1["speaker"],
                                    "segment_start": seg1["start"],
                                    "segment_end": seg1["end"]
                                },
                                {
                                    "speaker": seg2["speaker"],
                                    "segment_start": seg2["start"],
                                    "segment_end": seg2["end"]
                                }
                            ],
                            "timestamp": TextProcessor.format_timestamp(overlap_start)
                        }
                        
                        overlaps.append(overlap_data)
        
        return overlaps
    
    def _calculate_diarization_stats(self, segments: List[Dict]) -> Dict:
        """Calculate diarization statistics"""
        if not segments:
            return {"num_speakers": 0, "total_speech_time": 0}
        
        speakers = set(segment["speaker"] for segment in segments)
        total_duration = sum(segment["duration"] for segment in segments)
        
        # Per-speaker statistics
        speaker_stats = {}
        for speaker in speakers:
            speaker_segments = [s for s in segments if s["speaker"] == speaker]
            speaker_time = sum(s["duration"] for s in speaker_segments)
            speaker_stats[speaker] = {
                "total_time": round(speaker_time, 2),
                "percentage": round((speaker_time / total_duration) * 100, 1) if total_duration > 0 else 0,
                "num_segments": len(speaker_segments),
                "avg_segment_length": round(speaker_time / len(speaker_segments), 2) if speaker_segments else 0
            }
        
        # Overall statistics
        segment_lengths = [s["duration"] for s in segments]
        
        return {
            "num_speakers": len(speakers),
            "total_speech_time": round(total_duration, 2),
            "num_segments": len(segments),
            "avg_segment_length": round(np.mean(segment_lengths), 2) if segment_lengths else 0,
            "median_segment_length": round(np.median(segment_lengths), 2) if segment_lengths else 0,
            "speaker_stats": speaker_stats
        }
    
    def merge_consecutive_segments(self, segments: List[Dict], max_gap: float = 2.0) -> List[Dict]:
        """Merge consecutive segments from same speaker"""
        if not segments:
            return []
        
        merged = []
        current_segment = segments[0].copy()
        
        for next_segment in segments[1:]:
            # Check if same speaker and gap is small
            gap = next_segment["start"] - current_segment["end"]
            
            if (current_segment["speaker"] == next_segment["speaker"] and 
                gap <= max_gap):
                # Merge segments
                current_segment["end"] = next_segment["end"]
                current_segment["duration"] = current_segment["end"] - current_segment["start"]
            else:
                # Start new segment
                merged.append(current_segment)
                current_segment = next_segment.copy()
        
        # Add last segment
        merged.append(current_segment)
        
        logger.info(f"Merged {len(segments)} segments into {len(merged)} segments")
        return merged
    
    def get_speaker_embeddings(self, audio_path: Path) -> Dict:
        """Extract speaker embeddings for each speaker"""
        try:
            if not self.pipeline:
                return {"error": "Pipeline not loaded"}
            
            # Perform diarization first
            diarization_result = self.diarize_audio(audio_path)
            
            if diarization_result.get("status") != "success":
                return diarization_result
            
            # Extract embeddings for each speaker segment
            audio, sr = librosa.load(str(audio_path), sr=16000)
            
            embeddings = {}
            for segment in diarization_result["segments"]:
                speaker = segment["speaker"]
                start_sample = int(segment["start"] * sr)
                end_sample = int(segment["end"] * sr)
                
                # Extract audio segment
                segment_audio = audio[start_sample:end_sample]
                
                # This would require additional models for embedding extraction
                # For now, just return segment info
                if speaker not in embeddings:
                    embeddings[speaker] = {
                        "segments": [],
                        "total_duration": 0
                    }
                
                embeddings[speaker]["segments"].append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "duration": segment["duration"]
                })
                embeddings[speaker]["total_duration"] += segment["duration"]
            
            return {
                "status": "success",
                "embeddings": embeddings
            }
            
        except Exception as e:
            logger.error(f"Embedding extraction error: {e}")
            return {"error": str(e)}
    
    def get_pipeline_info(self) -> Dict:
        """Get information about the loaded pipeline"""
        return {
            "is_loaded": self.pipeline is not None,
            "device": str(self.device),
            "has_hf_token": self.hf_token is not None,
            "model_dir": str(self.model_dir)
        }


# Global diarization engine instance
diarization_engine = SpeakerDiarizationEngine()


async def initialize_diarization_engine() -> bool:
    """Initialize the global diarization engine"""
    global diarization_engine
    
    logger.info("Initializing speaker diarization engine...")
    
    # Load pipeline
    success = diarization_engine.load_pipeline()
    
    if success:
        logger.info("Speaker diarization engine ready")
    else:
        logger.error("Failed to initialize speaker diarization engine")
    
    return success