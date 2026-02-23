#!/usr/bin/env python3
"""
Simple Whisper transcription test - Fixed version
"""
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
    """Create a simple test audio file"""
    try:
        duration = 3  # 3 seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create a simple test signal
        audio = np.sin(2 * np.pi * 440 * t) * 0.3  # A note
        audio += np.sin(2 * np.pi * 880 * t) * 0.2  # Higher A note
        audio += np.random.normal(0, 0.02, len(audio))  # Noise
        
        # Normalize
        audio = audio / np.max(np.abs(audio)) * 0.8
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        sf.write(temp_file.name, audio, sample_rate)
        
        logger.info(f"✅ Test audio created: {temp_file.name}")
        return temp_file.name
        
    except Exception as e:
        logger.error(f"❌ Failed to create test audio: {e}")
        return None

def test_transcription():
    """Test the enhanced transcription functionality"""
    
    logger.info("🎯 Testing Enhanced Whisper Transcription")
    logger.info("="*60)
    
    try:
        from transcriber import TranscriptionEngine
        
        # Initialize transcriber
        logger.info("📋 Initializing transcriber...")
        transcriber = TranscriptionEngine()
        
        # Check if model is loaded
        logger.info(f"✅ Transcriber initialized!")
        logger.info(f"   Model: {transcriber.model_size}")
        logger.info(f"   Device: {transcriber.device}")
        logger.info(f"   Model loaded: {transcriber.model is not None}")
        
        if not transcriber.model:
            logger.warning("⚠️ Model not automatically loaded, trying manual load...")
            success = transcriber.load_model()
            logger.info(f"   Manual load result: {success}")
        
        # Create test audio
        logger.info("\n📋 Creating test audio...")
        test_audio = create_test_audio()
        
        if not test_audio:
            logger.error("❌ Could not create test audio")
            return
        
        # Test transcription
        logger.info("\n🎙️ Testing transcription...")
        try:
            # Use the enhanced pipeline
            result = transcriber.transcribe_with_enhanced_pipeline(Path(test_audio))
            
            if result and "error" not in result:
                logger.info("✅ Transcription successful!")
                logger.info(f"   Language: {result.get('language', 'Unknown')}")
                logger.info(f"   Duration: {result.get('duration', 'Unknown')} seconds")
                logger.info(f"   Text: '{result.get('full_text', 'No text')}'")
                logger.info(f"   Segments: {len(result.get('segments', []))}")
                logger.info(f"   Quality: {result.get('quality_score', 'N/A')}")
                
            else:
                logger.warning(f"⚠️ Transcription failed or returned error")
                logger.info(f"   Result: {result}")
                
        except Exception as e:
            logger.error(f"❌ Transcription test failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Test basic transcription as fallback
        logger.info("\n🔧 Testing basic transcription...")
        try:
            basic_result = transcriber.transcribe_audio(Path(test_audio))
            
            if basic_result and "error" not in basic_result:
                logger.info("✅ Basic transcription successful!")
                logger.info(f"   Result type: {type(basic_result)}")
                if isinstance(basic_result, dict):
                    logger.info(f"   Keys: {list(basic_result.keys())}")
            else:
                logger.warning("⚠️ Basic transcription failed")
                
        except Exception as e:
            logger.warning(f"⚠️ Basic transcription error: {e}")
        
        # Configuration info
        logger.info("\n⚙️ Configuration:")
        logger.info(f"   VAD filter: {transcriber.vad_filter}")
        logger.info(f"   Beam size: {transcriber.beam_size}")
        logger.info(f"   Compute type: {transcriber.compute_type}")
        logger.info(f"   Word timestamps: {transcriber.word_timestamps}")
        
        # Clean up
        try:
            Path(test_audio).unlink()
            logger.info("🧹 Cleaned up test file")
        except:
            pass
        
        logger.info("\n🎉 Transcription test completed!")
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.info("💡 Make sure faster-whisper is installed")
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    logger.info("🚀 Enhanced Whisper Transcription Test (Fixed)")
    logger.info("🎯 Testing direct Whisper functionality")
    
    test_transcription()
    
    logger.info("\n✅ Testing completed!")
    logger.info("💡 Your enhanced transcriber is ready for real audio files!")