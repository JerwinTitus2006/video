#!/usr/bin/env python3
"""
Download datasets for the enhanced meeting transcriber
"""
import asyncio
import logging
import os
from pathlib import Path
from datasets import load_dataset
from huggingface_hub import snapshot_download
import sys

# Add backend to path
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def download_librispeech():
    """Download LibriSpeech dataset for testing"""
    logger.info("📥 Downloading LibriSpeech dataset...")
    try:
        # Download LibriSpeech test.clean subset (smaller, good for testing)
        dataset = load_dataset("librispeech_asr", "clean", split="test.clean", cache_dir="data")
        logger.info(f"✅ LibriSpeech downloaded: {len(dataset)} samples")
        return True
    except Exception as e:
        logger.error(f"❌ LibriSpeech download failed: {e}")
        return False

def download_common_voice():
    """Download Common Voice English dataset"""
    logger.info("📥 Downloading Common Voice English dataset...")
    try:
        # Download small subset of Common Voice
        dataset = load_dataset("mozilla-foundation/common_voice_11_0", "en", split="test[:100]", cache_dir="data", trust_remote_code=True)
        logger.info(f"✅ Common Voice downloaded: {len(dataset)} samples")
        return True
    except Exception as e:
        logger.error(f"❌ Common Voice download failed: {e}")
        return False

def download_fleurs():
    """Download FLEURS English dataset"""
    logger.info("📥 Downloading FLEURS English dataset...")
    try:
        # Download FLEURS English subset
        dataset = load_dataset("google/fleurs", "en_us", split="test[:50]", cache_dir="data")
        logger.info(f"✅ FLEURS downloaded: {len(dataset)} samples")
        return True
    except Exception as e:
        logger.error(f"❌ FLEURS download failed: {e}")
        return False

def download_voxpopuli():
    """Download VoxPopuli English dataset"""
    logger.info("📥 Downloading VoxPopuli English dataset...")
    try:
        # Download VoxPopuli English test set
        dataset = load_dataset("facebook/voxpopuli", "en", split="test[:25]", cache_dir="data")
        logger.info(f"✅ VoxPopuli downloaded: {len(dataset)} samples")
        return True
    except Exception as e:
        logger.error(f"❌ VoxPopuli download failed: {e}")
        return False

def download_tedlium():
    """Download TEDLium dataset"""
    logger.info("📥 Downloading TEDLium dataset...")
    try:
        # Download TEDLium Release 3 test set
        dataset = load_dataset("LIUM/tedlium", "release3", split="test[:20]", cache_dir="data")
        logger.info(f"✅ TEDLium downloaded: {len(dataset)} samples")
        return True
    except Exception as e:
        logger.error(f"❌ TEDLium download failed: {e}")
        return False

def download_available_datasets():
    """Try to download available speech/meeting datasets"""
    logger.info("🎯 Starting dataset download process...")
    
    results = {}
    datasets_to_try = [
        ("LibriSpeech", download_librispeech),
        ("Common Voice", download_common_voice),
        ("FLEURS", download_fleurs),
        ("VoxPopuli", download_voxpopuli),
        ("TEDLium", download_tedlium)
    ]
    
    for dataset_name, download_func in datasets_to_try:
        logger.info(f"\n📋 Attempting to download {dataset_name}...")
        try:
            success = download_func()
            results[dataset_name] = success
            if success:
                logger.info(f"✅ {dataset_name} downloaded successfully!")
            else:
                logger.warning(f"⚠️ {dataset_name} download failed")
        except Exception as e:
            logger.error(f"❌ Error downloading {dataset_name}: {e}")
            results[dataset_name] = False
    
    # Summary
    logger.info(f"\n📊 Download Summary:")
    successful = sum(1 for success in results.values() if success)
    total = len(results)
    logger.info(f"   ✅ Successful: {successful}/{total}")
    
    for name, success in results.items():
        status = "✅ Success" if success else "❌ Failed"
        logger.info(f"   {name}: {status}")
    
    if successful > 0:
        logger.info(f"\n🎉 Downloaded {successful} datasets successfully!")
        logger.info("Data saved to 'data' directory")
    else:
        logger.info("\n😞 No datasets downloaded successfully")
        logger.info("This might be due to network issues or dataset access restrictions")
    
    return results

if __name__ == "__main__":
    logger.info("🚀 Enhanced Meeting Transcriber - Dataset Downloader")
    logger.info("=" * 60)
    
    # Create data directory
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    logger.info(f"📁 Data directory: {data_dir.absolute()}")
    
    # Download datasets
    results = download_available_datasets()
    
    logger.info("\n🎊 Dataset download completed!")