#!/usr/bin/env python3
"""
Simple dataset downloader for enhanced meeting transcriber
"""
import logging
from pathlib import Path
from datasets import load_dataset
import sys

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def download_small_datasets():
    """Download small, reliable datasets for testing"""
    logger.info("🎯 Downloading Small Test Datasets")
    
    success_count = 0
    
    # Create data directory
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # 1. Small subset of Common Voice (very reliable)
    try:
        logger.info("📥 Downloading Common Voice (small subset)...")
        dataset = load_dataset(
            "mozilla-foundation/common_voice_11_0", 
            "en", 
            split="test[:10]",  # Just 10 samples
            cache_dir=str(data_dir),
            trust_remote_code=True
        )
        logger.info(f"✅ Common Voice downloaded: {len(dataset)} samples")
        success_count += 1
    except Exception as e:
        logger.error(f"❌ Common Voice failed: {e}")
    
    # 2. Minds14 dataset (smaller, reliable)
    try:
        logger.info("📥 Downloading MINDS-14 dataset...")
        dataset = load_dataset(
            "PolyAI/minds14", 
            "en-US", 
            split="train[:20]",  # Just 20 samples
            cache_dir=str(data_dir)
        )
        logger.info(f"✅ MINDS-14 downloaded: {len(dataset)} samples")
        success_count += 1
    except Exception as e:
        logger.error(f"❌ MINDS-14 failed: {e}")
    
    # 3. Superb dataset (small subset)
    try:
        logger.info("📥 Downloading SUPERB dataset...")
        dataset = load_dataset(
            "superb",
            "asr",
            split="test[:15]",  # Just 15 samples  
            cache_dir=str(data_dir),
            trust_remote_code=True
        )
        logger.info(f"✅ SUPERB downloaded: {len(dataset)} samples")
        success_count += 1
    except Exception as e:
        logger.error(f"❌ SUPERB failed: {e}")
    
    # Summary
    logger.info(f"\n📊 Download Summary: {success_count}/3 datasets successful")
    
    if success_count > 0:
        logger.info("🎉 Test datasets ready!")
        logger.info(f"📁 Data saved to: {data_dir.absolute()}")
        
        # Show directory contents
        logger.info("\n📋 Downloaded datasets:")
        for item in data_dir.iterdir():
            if item.is_dir():
                logger.info(f"   📁 {item.name}")
    else:
        logger.warning("😞 No datasets downloaded successfully")
    
    return success_count

if __name__ == "__main__":
    logger.info("🚀 Simple Dataset Downloader")
    logger.info("="*40)
    
    success = download_small_datasets()
    
    if success > 0:
        logger.info("\n✅ Datasets ready for enhanced transcription testing!")
    else:
        logger.info("\n❌ Dataset download failed. Please check your internet connection.")