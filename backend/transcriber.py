import logging
import torch
import yaml
import os
import ffmpeg
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Generator
from faster_whisper import WhisperModel
import librosa
import numpy as np
import soundfile as sf
from datasets import load_from_disk
from utils import ConfigManager, TextProcessor

logger = logging.getLogger(__name__)

# Load configuration
config_path = Path(__file__).parent.parent / "config.yaml"
if config_path.exists():
    with open(config_path) as f:
        config = yaml.safe_load(f)
else:
    # Default config if file doesn't exist
    config = {
        "models": {"asr": "large-v3", "diarization": "pyannote/speaker-diarization-3.1"},
        "processing": {"device": "auto", "compute_type": "int8", "beam_size": 5, "vad_filter": True, "word_timestamps": True},
        "audio": {"sample_rate": 16000, "channels": 1}
    }


class TranscriptionEngine:
    """Enhanced transcription engine using faster-whisper with WhisperX-style processing"""
    
    def __init__(self, model_size: str = None):
        """
        Initialize transcription engine with config-based settings
        
        Args:
            model_size: Override model size from config
        """
        # Use config or fallback to parameter
        self.model_size = model_size or config.get("models", {}).get("asr", "large-v3")
        self.model = None
        
        # Auto-detect device or use config
        device_setting = config.get("processing", {}).get("device", "auto")
        if device_setting == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device_setting
            
        # Set compute type based on device and config
        self.compute_type = config.get("processing", {}).get("compute_type", "int8")
        if self.device == "cuda" and self.compute_type == "int8":
            self.compute_type = "float16"  # Better for CUDA
            
        self.model_dir = ConfigManager.get_model_cache_dir()
        
        # Processing settings from config
        processing_config = config.get("processing", {})
        self.beam_size = processing_config.get("beam_size", 5)
        self.vad_filter = processing_config.get("vad_filter", True)
        self.word_timestamps = processing_config.get("word_timestamps", True)
        
        logger.info(f"Enhanced transcription engine initialized with {self.model_size} model on {self.device}")
        logger.info(f"Compute type: {self.compute_type}, Beam size: {self.beam_size}, VAD: {self.vad_filter}")
        
        # Auto-load model
        self.load_model()
    
    def load_model(self) -> bool:
        """Load enhanced Whisper model with optimized settings"""
        try:
            logger.info(f"Loading enhanced Whisper {self.model_size} model...")
            
            # Enhanced model loading with better error handling
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                download_root=str(self.model_dir),
                local_files_only=False,
                num_workers=1  # Optimize for stability
            )
            
            logger.info(f"Enhanced Whisper model loaded successfully on {self.device}")
            logger.info(f"Model info - Size: {self.model_size}, Device: {self.device}, Compute: {self.compute_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            # Try fallback to smaller model if large model fails
            if self.model_size in ["large-v3", "large-v2", "large"]:
                logger.info("Attempting fallback to medium model...")
                try:
                    self.model_size = "medium"
                    self.model = WhisperModel(
                        self.model_size,
                        device=self.device,
                        compute_type=self.compute_type,
                        download_root=str(self.model_dir),
                        local_files_only=False
                    )
                    logger.info("Fallback to medium model successful")
                    return True
                except Exception as fallback_error:
                    logger.error(f"Fallback model loading failed: {fallback_error}")
            return False
    
    def extract_audio_for_processing(self, media_path: Path, output_path: Path) -> bool:
        """Extract and prepare audio using ffmpeg for optimal processing"""
        try:
            audio_config = config.get("audio", {})
            sample_rate = audio_config.get("sample_rate", 16000)
            channels = audio_config.get("channels", 1)
            
            # Use ffmpeg for high-quality audio extraction
            (
                ffmpeg
                .input(str(media_path))
                .output(
                    str(output_path),
                    acodec="pcm_s16le",
                    ar=sample_rate,
                    ac=channels
                )
                .overwrite_output()
                .run(quiet=True)
            )
            
            logger.info(f"Audio extracted: {output_path} ({sample_rate}Hz, {channels} channel)")
            return True
            
        except Exception as e:
            logger.error(f"Audio extraction failed: {e}")
            return False
    
    def transcribe_with_enhanced_pipeline(self,
                                        audio_path: Path,
                                        language: Optional[str] = None,
                                        initial_prompt: Optional[str] = None) -> Dict:
        """
        Enhanced transcription with WhisperX-style processing
        
        Args:
            audio_path: Path to audio file
            language: Language code (auto-detect if None)
            initial_prompt: Initial prompt to guide transcription
            
        Returns:
            Dictionary with enhanced transcription results
        """
        if not self.model:
            logger.error("Model not loaded. Call load_model() first.")
            return {"error": "Model not loaded"}
        
        try:
            logger.info(f"Enhanced transcription processing: {audio_path}")
            
            # Enhanced transcription options with config values
            transcribe_options = {
                "language": language,
                "initial_prompt": initial_prompt,
                "word_timestamps": self.word_timestamps,
                "vad_filter": self.vad_filter,
                "beam_size": self.beam_size,
                "temperature": 0.0,  # Deterministic for better accuracy
                "condition_on_previous_text": True,
                "compression_ratio_threshold": 2.4,
                "log_prob_threshold": -1.0,
                "no_speech_threshold": 0.6,
                "without_timestamps": False,
                "max_initial_timestamp": 1.0,
                "length_penalty": 1.0
            }
            
            # Enhanced transcription process
            logger.info(f"Processing with beam_size={self.beam_size}, vad_filter={self.vad_filter}")
            segments, info = self.model.transcribe(
                str(audio_path),
                **transcribe_options
            )
            
            # Enhanced segment processing with better timing
            transcript_data = self._process_enhanced_segments(segments, info)
            
            # Calculate enhanced quality metrics
            quality_metrics = self._calculate_enhanced_quality_score(transcript_data, info)
            
            logger.info(f"Enhanced transcription completed. Language: {info.language}, Duration: {info.duration:.2f}s")
            logger.info(f"Quality score: {quality_metrics['overall_score']:.3f}, Word accuracy: {quality_metrics.get('word_accuracy', 'N/A')}")
            
            return {
                "status": "success",
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "segments": transcript_data["segments"],
                "full_text": transcript_data["full_text"],
                "word_count": transcript_data["word_count"],
                "confidence_score": transcript_data["avg_confidence"],
                "quality_metrics": quality_metrics,
                "processing_info": {
                    "model_size": self.model_size,
                    "device": self.device,
                    "compute_type": self.compute_type,
                    "vad_filter": self.vad_filter,
                    "beam_size": self.beam_size
                }
            }
            
        except Exception as e:
            logger.error(f"Enhanced transcription error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def transcribe_from_dataset(self, dataset_sample: Dict, sample_id: str) -> Dict:
        """Process audio from dataset samples (AMI, MeetingBank)"""
        try:
            # Create temporary audio file
            temp_dir = Path(config.get("temp_dir", "temp"))
            temp_dir.mkdir(exist_ok=True)
            
            audio_path = temp_dir / f"dataset_sample_{sample_id}.wav"
            
            # Handle different dataset audio formats
            if 'audio' in dataset_sample:
                audio_data = dataset_sample['audio']
                if isinstance(audio_data, dict):
                    # HuggingFace dataset format
                    array = audio_data.get('array', [])
                    sample_rate = audio_data.get('sampling_rate', 16000)
                    
                    # Write audio file
                    sf.write(str(audio_path), array, sample_rate)
                else:
                    # Direct audio data
                    with open(audio_path, 'wb') as f:
                        f.write(audio_data)
            else:
                return {"error": "No audio data found in sample", "status": "failed"}
            
            # Transcribe with enhanced pipeline
            result = self.transcribe_with_enhanced_pipeline(audio_path)
            
            # Cleanup
            if audio_path.exists():
                audio_path.unlink()
            
            return result
            
        except Exception as e:
            logger.error(f"Dataset transcription error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def batch_process_dataset(self, dataset_path: Path, output_dir: Path, max_samples: int = 5) -> List[Dict]:
        """Process multiple samples from dataset"""
        try:
            if not dataset_path.exists():
                logger.error(f"Dataset path not found: {dataset_path}")
                return []
            
            # Load dataset
            dataset = load_from_disk(str(dataset_path))
            
            results = []
            samples_to_process = min(len(dataset), max_samples) if hasattr(dataset, '__len__') else max_samples
            
            logger.info(f"Processing {samples_to_process} samples from {dataset_path}")
            
            for i in range(samples_to_process):
                try:
                    sample = dataset[i] if hasattr(dataset, '__getitem__') else next(iter(dataset))
                    
                    # Process sample
                    result = self.transcribe_from_dataset(sample, str(i))
                    
                    if result.get("status") == "success":
                        # Save individual result
                        output_file = output_dir / f"sample_{i}_transcript.txt"
                        timestamp_transcript = self._format_timestamp_transcript(result["segments"])
                        
                        with open(output_file, 'w', encoding='utf-8') as f:
                            f.write(f"Sample {i} - Enhanced Transcription\n")
                            f.write(f"Language: {result['language']}\n")
                            f.write(f"Duration: {result['duration']:.2f}s\n")
                            f.write(f"Quality Score: {result['quality_metrics']['overall_score']:.3f}\n")
                            f.write("\n" + "="*50 + "\n\n")
                            f.write(timestamp_transcript)
                        
                        logger.info(f"Processed sample {i}: {result['word_count']} words, {result['duration']:.1f}s")
                    
                    results.append(result)
                    
                except Exception as sample_error:
                    logger.error(f"Error processing sample {i}: {sample_error}")
                    results.append({"error": str(sample_error), "status": "failed", "sample_id": i})
            
            return results
            
        except Exception as e:
            logger.error(f"Batch processing error: {e}")
            return []
    
    def _format_timestamp_transcript(self, segments: List[Dict]) -> str:
        """Format segments into timestamp transcript like the user's example"""
        transcript_lines = []
        
        for segment in segments:
            start_time = segment.get('start', 0)
            timestamp = f"{int(start_time//3600):02d}:{int((start_time%3600)//60):02d}:{int(start_time%60):02d}"
            speaker = segment.get('speaker', 'Speaker_Unknown')
            text = segment.get('text', '').strip()
            
            if text:
                transcript_lines.append(f"[{timestamp}] {speaker}: {text}")
        
        return "\n".join(transcript_lines)
    
    def _process_enhanced_segments(self, segments, info) -> Dict:
        """Process transcription segments with enhanced features"""
        processed_segments = []
        full_text = ""
        total_confidence = 0
        word_count = 0
        total_words_with_timestamps = 0
        
        for segment in segments:
            # Enhanced segment processing
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": getattr(segment, 'avg_logprob', 0.0),
                "no_speech_prob": getattr(segment, 'no_speech_prob', 0.0),
                "timestamp": TextProcessor.format_timestamp(segment.start),
                "duration": segment.end - segment.start,
                "speaker": "Speaker_Unknown"  # Will be updated by diarization
            }
            
            # Enhanced word-level processing
            if hasattr(segment, 'words') and segment.words:
                segment_data["words"] = []
                segment_word_count = 0
                segment_confidence_sum = 0
                
                for word in segment.words:
                    word_data = {
                        "word": word.word.strip(),
                        "start": word.start,
                        "end": word.end,
                        "confidence": word.probability,
                        "timestamp": TextProcessor.format_timestamp(word.start)
                    }
                    segment_data["words"].append(word_data)
                    segment_word_count += 1
                    segment_confidence_sum += word.probability
                    total_words_with_timestamps += 1
                
                # Calculate segment average confidence from words
                if segment_word_count > 0:
                    segment_data["confidence"] = segment_confidence_sum / segment_word_count
                
                word_count += segment_word_count
            else:
                # Fallback word count
                word_count += len(segment.text.split())
            
            processed_segments.append(segment_data)
            full_text += segment.text.strip() + " "
            total_confidence += segment_data["confidence"]
        
        avg_confidence = total_confidence / len(processed_segments) if processed_segments else 0
        
        return {
            "segments": processed_segments,
            "full_text": full_text.strip(),
            "word_count": word_count,
            "avg_confidence": avg_confidence,
            "total_words_with_timestamps": total_words_with_timestamps
        }
    
    def _calculate_enhanced_quality_score(self, transcript_data: Dict, info) -> Dict:
        """Calculate enhanced quality metrics"""
        segments = transcript_data["segments"]
        total_duration = info.duration if hasattr(info, 'duration') else 0
        
        if not segments:
            return {"overall_score": 0, "confidence": 0, "coverage": 0}
        
        # Enhanced confidence calculation
        avg_confidence = transcript_data["avg_confidence"]
        
        # Enhanced coverage calculation
        transcribed_duration = sum(seg["end"] - seg["start"] for seg in segments)
        coverage = min(1.0, transcribed_duration / total_duration) if total_duration > 0 else 0
        
        # Word-level accuracy (if available)
        word_accuracy = 1.0
        if transcript_data["total_words_with_timestamps"] > 0:
            high_conf_words = sum(
                1 for seg in segments 
                for word in seg.get("words", []) 
                if word["confidence"] > 0.7
            )
            word_accuracy = high_conf_words / transcript_data["total_words_with_timestamps"]
        
        # Speech rate consistency
        speech_rates = []
        for seg in segments:
            duration = seg["end"] - seg["start"]
            words_in_segment = len(seg["text"].split())
            if duration > 0 and words_in_segment > 0:
                speech_rates.append(words_in_segment / duration)
        
        rate_consistency = 1.0
        if len(speech_rates) > 1:
            rate_std = np.std(speech_rates)
            rate_mean = np.mean(speech_rates)
            if rate_mean > 0:
                rate_consistency = max(0, 1.0 - (rate_std / rate_mean))
        
        # Enhanced overall score
        overall_score = (avg_confidence * 0.4 + coverage * 0.3 + word_accuracy * 0.2 + rate_consistency * 0.1)
        
        return {
            "overall_score": round(overall_score, 3),
            "confidence": round(avg_confidence, 3),
            "coverage": round(coverage, 3),
            "word_accuracy": round(word_accuracy, 3),
            "rate_consistency": round(rate_consistency, 3),
            "avg_speech_rate": round(np.mean(speech_rates), 2) if speech_rates else 0,
            "total_segments": len(segments),
            "words_with_timestamps": transcript_data["total_words_with_timestamps"]
        }
    
    # Compatibility method for existing code
    def transcribe_audio(self, audio_path: Path, **kwargs) -> Dict:
        """Compatibility wrapper for existing code"""
        return self.transcribe_with_enhanced_pipeline(audio_path, **kwargs)
    
    def transcribe_streaming(self, audio_path: Path) -> Generator[Dict, None, None]:
        """Stream transcription results as they become available"""
        if not self.model:
            logger.error("Model not loaded. Call load_model() first.")
            return
        
        try:
            segments, info = self.model.transcribe(
                str(audio_path),
                word_timestamps=self.word_timestamps,
                vad_filter=self.vad_filter,
                beam_size=self.beam_size
            )
            
            # Yield language info first
            yield {
                "type": "info",
                "language": info.language,
                "duration": info.duration,
                "model_info": {
                    "size": self.model_size,
                    "device": self.device,
                    "compute_type": self.compute_type
                }
            }
            
            # Yield segments as they're processed
            for segment in segments:
                segment_data = {
                    "type": "segment",
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "timestamp": TextProcessor.format_timestamp(segment.start),
                    "confidence": getattr(segment, 'avg_logprob', 0.0)
                }
                yield segment_data
                
        except Exception as e:
            logger.error(f"Streaming transcription error: {e}")
            yield {"type": "error", "message": str(e)}
    
    def detect_language(self, audio_path: Path) -> Dict:
        """Detect language of audio file"""
        if not self.model:
            return {"error": "Model not loaded"}
        
        try:
            # Load audio for language detection
            audio, sr = librosa.load(str(audio_path), sr=16000, duration=30)  # First 30 seconds
            
            # Detect language
            segments, info = self.model.transcribe(audio, language=None)
            
            return {
                "language": info.language,
                "language_probability": info.language_probability,
                "detected_languages": getattr(info, 'all_language_probs', {}),
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def get_model_info(self) -> Dict:
        """Get enhanced information about the loaded model"""
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "is_loaded": self.model is not None,
            "supported_languages": self._get_supported_languages(),
            "processing_config": {
                "beam_size": self.beam_size,
                "vad_filter": self.vad_filter,
                "word_timestamps": self.word_timestamps
            },
            "audio_config": config.get("audio", {})
        }
    
    def _get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        # Whisper supported languages
        return [
            "en", "zh", "de", "es", "ru", "ko", "fr", "ja", "pt", "tr", "pl", "ca", "nl",
            "ar", "sv", "it", "id", "hi", "fi", "vi", "he", "uk", "el", "ms", "cs", "ro",
            "da", "hu", "ta", "no", "th", "ur", "hr", "bg", "lt", "la", "mi", "ml", "cy",
            "sk", "te", "fa", "lv", "bn", "sr", "az", "sl", "kn", "et", "mk", "br", "eu",
            "is", "hy", "ne", "mn", "bs", "kk", "sq", "sw", "gl", "mr", "pa", "si", "km",
            "sn", "yo", "so", "af", "oc", "ka", "be", "tg", "sd", "gu", "am", "yi", "lo",
            "uz", "fo", "ht", "ps", "tk", "nn", "mt", "sa", "lb", "my", "bo", "tl", "mg",
            "as", "tt", "haw", "ln", "ha", "ba", "jw", "su"
        ]
    
    def transcribe_with_quality_check(self, audio_path: Path) -> Dict:
        """Transcribe with enhanced quality assessment"""
        result = self.transcribe_with_enhanced_pipeline(audio_path)
        
        if result.get("status") == "success":
            # Quality metrics already included in enhanced pipeline
            quality_score = result["quality_metrics"]
            result["recommendations"] = self._get_enhanced_quality_recommendations(quality_score)
        
        return result
    
    def _get_enhanced_quality_recommendations(self, quality_metrics: Dict) -> List[str]:
        """Generate enhanced quality improvement recommendations"""
        recommendations = []
        
        overall_score = quality_metrics.get("overall_score", 0)
        confidence = quality_metrics.get("confidence", 0)
        coverage = quality_metrics.get("coverage", 0)
        word_accuracy = quality_metrics.get("word_accuracy", 0)
        rate_consistency = quality_metrics.get("rate_consistency", 0)
        
        if confidence < 0.5:
            recommendations.append(f"Low confidence ({confidence:.2f}). Consider using a larger model or improve audio quality.")
        
        if coverage < 0.8:
            recommendations.append(f"Low coverage ({coverage:.2f}). Check for long silent periods or audio quality issues.")
        
        if word_accuracy < 0.7:
            recommendations.append(f"Low word accuracy ({word_accuracy:.2f}). Audio quality may be poor or contains noise.")
        
        if rate_consistency < 0.5:
            recommendations.append(f"Inconsistent speech rate ({rate_consistency:.2f}). May indicate overlapping speech or audio artifacts.")
        
        # Enhanced scoring recommendations
        if overall_score > 0.9:
            recommendations.append("🌟 Excellent transcription quality with enhanced processing!")
        elif overall_score > 0.8:
            recommendations.append("✅ Very good transcription quality.")
        elif overall_score > 0.6:
            recommendations.append("⚠️ Good transcription quality with minor issues.")
        elif overall_score > 0.4:
            recommendations.append("🔧 Moderate quality. Consider audio preprocessing or larger model.")
        else:
            recommendations.append("❌ Poor transcription quality. Improve audio or use different settings.")
        
        # Model-specific recommendations
        if self.model_size in ["tiny", "base"] and overall_score < 0.7:
            recommendations.append(f"💡 Current model: {self.model_size}. Try 'medium' or 'large-v3' for better accuracy.")
        
        if self.device == "cpu" and overall_score < 0.6:
            recommendations.append("🚀 Consider using GPU acceleration for better performance.")
        
        return recommendations


# Global transcription engine instance
transcription_engine = TranscriptionEngine()


async def initialize_transcription_engine(model_size: str = "medium") -> bool:
    """Initialize the global transcription engine"""
    global transcription_engine
    
    logger.info(f"Initializing transcription engine with {model_size} model...")
    
    # Update model size if different
    if transcription_engine.model_size != model_size:
        transcription_engine = TranscriptionEngine(model_size)
    
    # Load model
    success = transcription_engine.load_model()
    
    if success:
        logger.info("Transcription engine ready")
    else:
        logger.error("Failed to initialize transcription engine")
    
    return success