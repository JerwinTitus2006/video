import os
import logging
import yaml
from pathlib import Path
from typing import Optional, List, Dict
from datasets import load_dataset, load_from_disk
from huggingface_hub import login, snapshot_download
import pandas as pd
from .utils import ConfigManager

logger = logging.getLogger(__name__)

# Load configuration
config_path = Path(__file__).parent.parent / "config.yaml"
if config_path.exists():
    with open(config_path) as f:
        config = yaml.safe_load(f)
else:
    config = {"data_dir": "data", "datasets": {"ami": True, "meetingbank": True}}


class DatasetLoader:
    """Enhanced dataset loader for AMI Meeting Corpus and MeetingBank"""
    
    def __init__(self):
        # Use config data directory
        data_dir_config = config.get("data_dir", "data")
        self.data_dir = Path(data_dir_config)
        self.data_dir.mkdir(exist_ok=True)
        
        self.datasets = {}
        self.config = config
        
        logger.info(f"Dataset loader initialized with data directory: {self.data_dir}")
    
    def authenticate_huggingface(self) -> bool:
        """Authenticate with HuggingFace using token"""
        token = ConfigManager.get_huggingface_token()
        if token:
            try:
                login(token)
                logger.info("Successfully authenticated with HuggingFace")
                return True
            except Exception as e:
                logger.error(f"Failed to authenticate with HuggingFace: {e}")
                return False
        else:
            logger.warning("No HuggingFace token found. Some datasets may not be accessible.")
            return False
    
    def download_ami_dataset(self) -> bool:
        """Download AMI Meeting Corpus with audio and transcripts"""
        try:
            logger.info("Downloading AMI Meeting Corpus (Idiap/AMI-meetings)...")
            
            # Download the official AMI dataset from Idiap
            dataset = load_dataset("Idiap/AMI-meetings", split="train", trust_remote_code=True)
            
            # Save to disk for faster loading
            ami_path = self.data_dir / "AMI"
            dataset.save_to_disk(str(ami_path))
            
            # Dataset info
            ami_info = {
                'name': 'AMI Meeting Corpus (Idiap)',
                'description': 'Real meeting recordings with transcriptions and annotations from Idiap',
                'size': len(dataset),
                'features': list(dataset.features.keys()),
                'status': 'downloaded',
                'local_path': str(ami_path),
                'has_audio': 'audio' in dataset.features,
                'has_transcript': 'transcript' in dataset.features or 'text' in dataset.features
            }
            
            self.datasets['ami'] = ami_info
            logger.info(f"AMI dataset downloaded successfully: {ami_info['size']} samples")
            logger.info(f"Features available: {ami_info['features']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download AMI dataset: {e}")
            logger.info("Attempting fallback AMI dataset...")
            
            # Try fallback
            try:
                dataset = load_dataset("edinburghnlp/ami", trust_remote_code=True, cache_dir=str(self.data_dir))
                ami_info = {
                    'name': 'AMI Meeting Corpus (Edinburgh)',
                    'description': 'AMI meetings fallback dataset',
                    'size': len(dataset.get('train', [])) if 'train' in dataset else 0,
                    'features': list(dataset['train'].features.keys()) if 'train' in dataset else [],
                    'status': 'downloaded_fallback'
                }
                self.datasets['ami'] = ami_info
                logger.info("AMI fallback dataset downloaded")
                return True
            except Exception as fallback_error:
                logger.error(f"AMI fallback failed: {fallback_error}")
                return False
    
    def download_meetingbank_audio(self) -> bool:
        """Download MeetingBank Audio dataset using snapshot download"""
        try:
            logger.info("Downloading MeetingBank Audio (huuuyeah/MeetingBank_Audio)...")
            
            # Download MeetingBank Audio using snapshot
            meetingbank_path = self.data_dir / "MeetingBank_Audio"
            
            snapshot_download(
                "huuuyeah/MeetingBank_Audio",
                local_dir=str(meetingbank_path),
                local_dir_use_symlinks=False
            )
            
            # Count downloaded files
            audio_files = list(meetingbank_path.glob("**/*.wav")) + list(meetingbank_path.glob("**/*.mp3"))
            
            meetingbank_info = {
                'name': 'MeetingBank Audio',
                'description': 'MeetingBank audio files for meeting analysis',
                'size': len(audio_files),
                'local_path': str(meetingbank_path),
                'audio_files': len(audio_files),
                'status': 'downloaded'
            }
            
            self.datasets['meetingbank_audio'] = meetingbank_info
            logger.info(f"MeetingBank Audio downloaded successfully: {len(audio_files)} audio files")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download MeetingBank Audio: {e}")
            return False
    
    def download_meetingbank_dataset(self) -> bool:
        """Download MeetingBank text dataset"""
        try:
            logger.info("Downloading MeetingBank text dataset...")
            
            # MeetingBank text dataset
            dataset = load_dataset("huuuyeah/MeetingBank", trust_remote_code=True, cache_dir=str(self.data_dir))
            
            # Save to disk
            meetingbank_path = self.data_dir / "MeetingBank"
            if 'train' in dataset:
                dataset['train'].save_to_disk(str(meetingbank_path))
            
            meetingbank_info = {
                'name': 'MeetingBank Text',
                'description': 'Meeting summarization dataset with text',
                'size': len(dataset.get('train', [])),
                'features': list(dataset['train'].features.keys()) if dataset.get('train') else [],
                'status': 'downloaded',
                'local_path': str(meetingbank_path)
            }
            
            self.datasets['meetingbank'] = meetingbank_info
            logger.info(f"MeetingBank text dataset downloaded successfully: {meetingbank_info['size']} samples")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download MeetingBank text dataset: {e}")
            return False
    
    def authenticate_huggingface(self) -> bool:
        """Authenticate with HuggingFace if token is available"""
        try:
            # Check for HuggingFace token in environment or config
            token = os.environ.get('HUGGINGFACE_TOKEN') or self.config.get('huggingface_token')
            
            if token:
                login(token=token)
                logger.info("Successfully authenticated with HuggingFace")
                return True
            else:
                logger.info("No HuggingFace token found - continuing without authentication")
                return False
                
        except Exception as e:
            logger.warning(f"HuggingFace authentication failed: {e}")
            return False

    def download_all_datasets(self) -> Dict[str, bool]:
        """Download all configured datasets"""
        results = {}
        
        # Try to authenticate first
        self.authenticate_huggingface()
        
        # Download based on config
        dataset_config = self.config.get("datasets", {})
        
        if dataset_config.get("ami", True):
            logger.info("Downloading AMI dataset...")
            results['ami'] = self.download_ami_dataset()
        
        if dataset_config.get("meetingbank", True):
            logger.info("Downloading MeetingBank text dataset...")
            results['meetingbank'] = self.download_meetingbank_dataset()
            
            logger.info("Downloading MeetingBank audio dataset...")
            results['meetingbank_audio'] = self.download_meetingbank_audio()
        
        self.save_dataset_info()
        
        # Log summary
        successful = sum(1 for success in results.values() if success)
        total = len(results)
        logger.info(f"Dataset download completed: {successful}/{total} successful")
        
        return results
    
    def save_dataset_info(self) -> None:
        """Save dataset information to file"""
        info_file = self.data_dir / "datasets_info.json"
        try:
            import json
            with open(info_file, 'w') as f:
                json.dump(self.datasets, f, indent=2)
            logger.info(f"Dataset info saved to {info_file}")
        except Exception as e:
            logger.error(f"Failed to save dataset info: {e}")
    
    def load_dataset_info(self) -> Dict:
        """Load dataset information from file"""
        info_file = self.data_dir / "datasets_info.json"
        try:
            import json
            if info_file.exists():
                with open(info_file, 'r') as f:
                    self.datasets = json.load(f)
                    return self.datasets
        except Exception as e:
            logger.error(f"Failed to load dataset info: {e}")
        return {}
    
    def load_ami_for_processing(self) -> Optional[List[Dict]]:
        """Load AMI dataset samples for transcription processing"""
        try:
            ami_path = self.data_dir / "AMI"
            
            if ami_path.exists():
                dataset = load_from_disk(str(ami_path))
                logger.info(f"Loaded AMI dataset from disk: {len(dataset)} samples")
            else:
                # Download if not available
                if self.download_ami_dataset():
                    dataset = load_from_disk(str(ami_path))
                else:
                    return None
            
            # Convert to list of dictionaries for processing
            samples = []
            for i, sample in enumerate(dataset):
                if i >= 10:  # Limit to first 10 samples for testing
                    break
                    
                sample_data = {
                    'id': f"ami_{i}",
                    'audio': sample.get('audio'),
                    'transcript': sample.get('transcript') or sample.get('text', ''),
                    'meeting_id': sample.get('meeting_id', f"meeting_{i}"),
                    'source': 'AMI'
                }
                samples.append(sample_data)
            
            logger.info(f"Prepared {len(samples)} AMI samples for processing")
            return samples
            
        except Exception as e:
            logger.error(f"Failed to load AMI dataset for processing: {e}")
            return None
    
    def load_meetingbank_for_processing(self) -> Optional[List[Dict]]:
        """Load MeetingBank audio files for transcription processing"""
        try:
            meetingbank_path = self.data_dir / "MeetingBank_Audio"
            
            if not meetingbank_path.exists():
                if not self.download_meetingbank_audio():
                    return None
            
            # Find audio files
            audio_files = list(meetingbank_path.glob("**/*.wav")) + list(meetingbank_path.glob("**/*.mp3"))
            
            if not audio_files:
                logger.warning("No audio files found in MeetingBank dataset")
                return None
            
            # Convert to processing format
            samples = []
            for i, audio_file in enumerate(audio_files[:5]):  # Limit to first 5 files for testing
                sample_data = {
                    'id': f"meetingbank_{i}",
                    'audio_path': str(audio_file),
                    'meeting_id': audio_file.stem,
                    'source': 'MeetingBank'
                }
                samples.append(sample_data)
            
            logger.info(f"Prepared {len(samples)} MeetingBank audio samples for processing")
            return samples
            
        except Exception as e:
            logger.error(f"Failed to load MeetingBank dataset for processing: {e}")
            return None

    def get_sample_meeting_data(self, dataset_name: str = 'ami', num_samples: int = 5) -> List[Dict]:
        """Get sample meeting data for testing"""
        try:
            if dataset_name == 'ami':
                # Load a few AMI samples
                dataset = load_dataset("edinburghnlp/ami", trust_remote_code=True, cache_dir=str(self.data_dir))
                if 'train' in dataset:
                    samples = dataset['train'].select(range(min(num_samples, len(dataset['train']))))
                    return [dict(sample) for sample in samples]
            
            elif dataset_name == 'meetingbank':
                dataset = load_dataset("huuuyeah/MeetingBank", cache_dir=str(self.data_dir))
                if 'train' in dataset:
                    samples = dataset['train'].select(range(min(num_samples, len(dataset['train']))))
                    return [dict(sample) for sample in samples]
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to get sample data from {dataset_name}: {e}")
            return []
    
    def check_dataset_status(self) -> Dict[str, str]:
        """Check status of all datasets"""
        status = {}
        
        for dataset_name in ['ami', 'meetingbank', 'librispeech']:
            dataset_path = self.data_dir / dataset_name
            if dataset_path.exists():
                status[dataset_name] = 'downloaded'
            else:
                status[dataset_name] = 'not_downloaded'
        
        return status
    
    def get_available_samples(self) -> List[Dict]:
        """Get all available samples from loaded datasets"""
        all_samples = []
        
        # Load AMI samples
        ami_samples = self.load_ami_for_processing()
        if ami_samples:
            all_samples.extend(ami_samples)
        
        # Load MeetingBank samples
        meetingbank_samples = self.load_meetingbank_for_processing()
        if meetingbank_samples:
            all_samples.extend(meetingbank_samples)
        
        logger.info(f"Total available samples: {len(all_samples)}")
        return all_samples

    def get_dataset_stats(self) -> Dict:
        """Get statistics about downloaded datasets"""
        stats = {
            'total_datasets': len(self.datasets),
            'downloaded_datasets': sum(1 for d in self.datasets.values() if d.get('status') in ['downloaded', 'downloaded_fallback']),
            'total_samples': sum(d.get('size', 0) for d in self.datasets.values()),
            'disk_usage_mb': self._calculate_disk_usage(),
            'data_directory': str(self.data_dir),
            'datasets': self.datasets
        }
        return stats
    
    def _calculate_disk_usage(self) -> float:
        """Calculate disk usage of data directory in MB"""
        total_size = 0
        try:
            for root, dirs, files in os.walk(self.data_dir):
                for file in files:
                    file_path = Path(root) / file
                    total_size += file_path.stat().st_size
            return total_size / (1024 * 1024)  # Convert to MB
        except Exception as e:
            logger.error(f"Error calculating disk usage: {e}")
            return 0.0
    
    def cleanup_datasets(self, dataset_names: Optional[List[str]] = None) -> None:
        """Clean up downloaded datasets"""
        if dataset_names is None:
            dataset_names = list(self.datasets.keys())
        
        for name in dataset_names:
            dataset_path = self.data_dir / name
            if dataset_path.exists():
                import shutil
                try:
                    shutil.rmtree(dataset_path)
                    logger.info(f"Cleaned up dataset: {name}")
                    if name in self.datasets:
                        self.datasets[name]['status'] = 'not_downloaded'
                except Exception as e:
                    logger.error(f"Failed to cleanup {name}: {e}")


# Create global instance
dataset_loader = DatasetLoader()


async def initialize_datasets():
    """Initialize datasets on startup"""
    logger.info("Initializing datasets...")
    
    # Load existing dataset info
    dataset_loader.load_dataset_info()
    
    # Check if datasets need to be downloaded
    status = dataset_loader.check_dataset_status()
    
    # Download missing datasets
    if not any(s == 'downloaded' for s in status.values()):
        logger.info("No datasets found. Starting download...")
        results = dataset_loader.download_all_datasets()
        logger.info(f"Dataset download results: {results}")
    
    return dataset_loader.get_dataset_stats()


if __name__ == "__main__":
    # Test dataset loader
    import asyncio
    
    async def test():
        stats = await initialize_datasets()
        print(f"Dataset stats: {stats}")
        
        # Get sample data
        samples = dataset_loader.get_sample_meeting_data('ami', 2)
        print(f"Sample AMI data: {len(samples)} samples")
    
    asyncio.run(test())