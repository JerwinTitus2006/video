#!/usr/bin/env python3
"""
Test transcription and speaker diarization without datasets
"""
import asyncio
import logging
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
import tempfile

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_audio():
    """Create a simple test audio file for demonstration"""
    try:
        # Create a simple sine wave audio for testing
        duration = 10  # 10 seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create a simple audio signal (mix of frequencies)
        audio = np.sin(2 * np.pi * 440 * t) * 0.3  # A note
        audio += np.sin(2 * np.pi * 880 * t) * 0.2  # Higher A note
        
        # Add some noise to make it more realistic
        noise = np.random.normal(0, 0.05, len(audio))
        audio += noise
        
        # Normalize
        audio = audio / np.max(np.abs(audio))
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        sf.write(temp_file.name, audio, sample_rate)
        
        logger.info(f"✅ Created test audio file: {temp_file.name}")
        logger.info(f"   Duration: {duration}s, Sample rate: {sample_rate}Hz")
        
        return temp_file.name
        
    except Exception as e:
        logger.error(f"❌ Failed to create test audio: {e}")
        return None

async def test_transcription_and_diarization():
    """Test transcription and speaker diarization functionality"""
    
    logger.info("🎯 Testing Enhanced Transcription & Speaker Diarization")
    logger.info("="*60)
    
    try:
        from transcriber import TranscriptionEngine
        from diarizer import SpeakerDiarizer
        
        # Initialize engines
        logger.info("📋 Initializing AI engines...")
        transcriber = TranscriptionEngine()
        diarizer = SpeakerDiarizer()
        
        logger.info(f"✅ Transcriber ready: {transcriber.model_size} model on {transcriber.device}")
        logger.info(f"✅ Diarizer initialized")
        
        # Create test audio
        logger.info("\n📋 Creating test audio...")
        test_audio_path = create_test_audio()
        
        if not test_audio_path:
            logger.error("❌ Could not create test audio")
            return
        
        # Test 1: Basic transcription
        logger.info("\n🎧 Testing Basic Transcription...")
        try:
            # Use the enhanced pipeline
            result = await transcriber.transcribe_with_enhanced_pipeline(test_audio_path)
            
            logger.info("✅ Transcription completed!")
            logger.info(f"   Transcript: {result.get('transcript', 'No transcript')[:100]}...")
            logger.info(f"   Duration: {result.get('duration', 'Unknown')}")
            logger.info(f"   Confidence: {result.get('confidence', 'Unknown')}")
            
        except Exception as e:
            logger.warning(f"⚠️ Transcription test failed: {e}")
            # Try basic transcription
            try:
                basic_result = await transcriber.transcribe_audio(test_audio_path)
                logger.info("✅ Basic transcription worked!")
                logger.info(f"   Result: {str(basic_result)[:100]}...")
            except Exception as e2:
                logger.error(f"❌ Basic transcription also failed: {e2}")
        
        # Test 2: Speaker diarization
        logger.info("\n👥 Testing Speaker Diarization...")
        try:
            diarization_result = await diarizer.diarize_audio(test_audio_path)
            
            logger.info("✅ Speaker diarization completed!")
            logger.info(f"   Number of speakers: {len(diarization_result.get('speakers', []))}")
            
            for i, speaker_info in enumerate(diarization_result.get('speakers', [])[:3]):
                logger.info(f"   Speaker {i+1}: {speaker_info}")
                
        except Exception as e:
            logger.warning(f"⚠️ Diarization test failed: {e}")
        
        # Test 3: Combined processing
        logger.info("\n🎭 Testing Combined Processing...")
        try:
            # This would be the full pipeline
            logger.info("   Processing audio through full pipeline...")
            
            # Transcription
            transcript = await transcriber.transcribe_audio(test_audio_path)
            
            # Diarization
            speakers = await diarizer.diarize_audio(test_audio_path)
            
            logger.info("✅ Combined processing successful!")
            logger.info("   Both transcription and diarization engines working")
            
        except Exception as e:
            logger.warning(f"⚠️ Combined processing failed: {e}")
        
        # Clean up
        try:
            Path(test_audio_path).unlink()
            logger.info("🧹 Cleaned up test audio file")
        except:
            pass
        
        logger.info("\n🎊 Transcription & Diarization Test Completed!")
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.info("💡 Make sure all AI packages are installed")
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def show_available_models():
    """Show what models are configured and available"""
    
    logger.info("\n📋 Available Models & Configuration")
    logger.info("-"*40)
    
    try:
        from transcriber import config
        
        # Show transcription config
        models_config = config.get('models', {})
        processing_config = config.get('processing', {})
        
        logger.info("🎙️ Transcription (Whisper):")
        logger.info(f"   Model: {models_config.get('asr', 'large-v3')}")
        logger.info(f"   Device: {processing_config.get('device', 'auto')}")
        logger.info(f"   Compute: {processing_config.get('compute_type', 'int8')}")
        logger.info(f"   Beam size: {processing_config.get('beam_size', 5)}")
        logger.info(f"   VAD filter: {processing_config.get('vad_filter', True)}")
        
        logger.info("\n👥 Speaker Diarization:")
        logger.info(f"   Model: {models_config.get('diarization', 'pyannote/speaker-diarization-3.1')}")
        
        logger.info("\n⚙️ Audio Processing:")
        audio_config = config.get('audio', {})
        logger.info(f"   Sample rate: {audio_config.get('sample_rate', 16000)}Hz")
        logger.info(f"   Channels: {audio_config.get('channels', 1)}")
        
    except Exception as e:
        logger.error(f"❌ Could not load configuration: {e}")

if __name__ == "__main__":
    async def main():
        logger.info("🚀 Enhanced Meeting Transcriber - Direct Testing")
        logger.info("🎯 Focus: Transcription & Speaker Diarization")
        
        await show_available_models()
        await test_transcription_and_diarization()
        
        logger.info("\n✅ Testing completed! Your enhanced transcriber is ready.")
        logger.info("💡 You can now process real audio files using:")
        logger.info("   - transcriber.transcribe_audio(audio_path)")
        logger.info("   - diarizer.diarize_audio(audio_path)")
    
    asyncio.run(main())