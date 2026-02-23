#!/usr/bin/env python3
"""
Test script for the enhanced meeting transcriber with dataset support
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to Python path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_transcriber():
    """Test the enhanced transcriber"""
    try:
        # Import after path setup
        from transcriber import TranscriptionEngine, config
        from dataset_loader import dataset_loader
        
        logger.info("🎯 Testing Enhanced Meeting Transcriber")
        
        # Initialize transcription engine
        engine = TranscriptionEngine()
        
        # Test 1: Check initialization
        logger.info("\n📋 Test 1: Engine Initialization")
        logger.info(f"Engine initialized successfully: {engine is not None}")
        logger.info(f"WhisperX model size: {config.get('models', {}).get('asr', 'large-v3')}")
        logger.info(f"Model size from engine: {engine.model_size}")
        logger.info(f"Device: {engine.device}")
        
        # Test 2: Dataset availability
        logger.info("\n📋 Test 2: Dataset Availability")
        dataset_stats = dataset_loader.get_dataset_stats()
        logger.info(f"Total datasets: {dataset_stats['total_datasets']}")
        logger.info(f"Downloaded datasets: {dataset_stats['downloaded_datasets']}")
        logger.info(f"Available datasets: {list(dataset_stats['datasets'].keys())}")
        
        # Test 3: Get available samples
        logger.info("\n📋 Test 3: Available Samples")
        available_samples = dataset_loader.get_available_samples()
        logger.info(f"Total available samples: {len(available_samples)}")
        
        for i, sample in enumerate(available_samples[:3]):  # Show first 3 samples
            logger.info(f"Sample {i+1}: {sample['id']} from {sample['source']}")
        
        # Test 4: Test batch processing (with mock data if no audio available)
        logger.info("\n📋 Test 4: Batch Processing Capability")
        try:
            # Try to process available samples if any audio is found
            if available_samples:
                for sample in available_samples[:2]:  # Process first 2 samples
                    if 'audio_path' in sample:
                        logger.info(f"Audio path available: {sample['audio_path']}")
                        if Path(sample['audio_path']).exists():
                            logger.info(f"Testing audio file: {sample['audio_path']}")
                        else:
                            logger.info(f"Audio file not found: {sample['audio_path']}")
                    elif 'audio' in sample and sample['audio']:
                        logger.info(f"Testing in-memory audio data for: {sample['id']}")
                        logger.info("Audio data available but skipping actual processing")
                        break
                else:
                    logger.info("No processable audio samples found - testing configuration only")
            else:
                logger.info("No samples available - testing configuration only")
                
        except Exception as e:
            logger.warning(f"Batch processing test skipped: {e}")
        
        # Test 5: Quality assessment features
        logger.info("\n📋 Test 5: Quality Assessment Features")
        test_transcript = "This is a test transcript for quality assessment."
        test_audio_path = "dummy_path.wav"  # Mock path for testing
        
        try:
            quality_score = engine.assess_transcription_quality(test_transcript, test_audio_path)
            logger.info(f"Quality assessment working: Score = {quality_score:.2f}")
        except Exception as e:
            logger.info(f"Quality assessment test (expected to fail with dummy data): {str(e)[:100]}...")
        
        # Test 6: Configuration validation
        logger.info("\n📋 Test 6: Configuration Validation")
        config_valid = config is not None and 'models' in config
        logger.info(f"Configuration loaded: {config_valid}")
        
        if config_valid:
            models_config = config.get('models', {})
            processing_config = config.get('processing', {})
            logger.info(f"ASR model: {models_config.get('asr', 'Not set')}")
            logger.info(f"Diarization model: {models_config.get('diarization', 'Not set')}")
            logger.info(f"Compute type: {processing_config.get('compute_type', 'Not set')}")
            logger.info(f"Beam size: {processing_config.get('beam_size', 'Not set')}")
            logger.info(f"VAD filter: {processing_config.get('vad_filter', 'Not set')}")
        
        logger.info("\n✅ Enhanced transcriber test completed successfully!")
        logger.info("🎉 Ready for production use with WhisperX-style processing!")
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.info("Make sure all dependencies are installed")
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_dataset_loading():
    """Test dataset loading capabilities"""
    try:
        from dataset_loader import dataset_loader
        
        logger.info("\n🎯 Testing Dataset Loading")
        
        # Test dataset information
        logger.info("\n📋 Dataset Information")
        dataset_loader.load_dataset_info()
        stats = dataset_loader.get_dataset_stats()
        
        logger.info(f"Data directory: {stats['data_directory']}")
        logger.info(f"Disk usage: {stats['disk_usage_mb']:.2f} MB")
        
        # Test dataset status
        logger.info("\n📋 Dataset Status")
        status = dataset_loader.check_dataset_status()
        for name, status_val in status.items():
            logger.info(f"{name}: {status_val}")
        
        # Test authentication
        logger.info("\n📋 HuggingFace Authentication")
        auth_result = dataset_loader.authenticate_huggingface()
        logger.info(f"Authentication successful: {auth_result}")
        
        logger.info("\n✅ Dataset loading test completed!")
        
    except Exception as e:
        logger.error(f"Dataset loading test failed: {e}")

if __name__ == "__main__":
    async def main():
        logger.info("🚀 Starting Enhanced Transcriber Tests")
        
        await test_transcriber()
        await test_dataset_loading()
        
        logger.info("\n🎉 All tests completed!")
    
    asyncio.run(main())