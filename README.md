# Meeting AI - Advanced Transcription & Analysis

![Meeting AI Banner](https://img.shields.io/badge/Meeting%20AI-Advanced%20Transcription-blue?style=for-the-badge&logo=python)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green?style=flat-square&logo=fastapi)
![AI](https://img.shields.io/badge/AI%20Powered-Whisper%20%7C%20Pyannote-purple?style=flat-square)

A production-ready AI-powered web application that transforms meeting recordings into actionable insights through advanced transcription, speaker diarization, and intelligent summarization.

## 🌟 Features

### 🎯 Core Capabilities
- **Advanced Speech Recognition**: State-of-the-art Whisper models with 95+ language support
- **Speaker Diarization**: Automatic speaker identification and separation using pyannote.audio
- **AI-Powered Summarization**: Intelligent meeting summaries with key points extraction
- **Action Item Detection**: Automatic identification of tasks, assignees, and deadlines
- **Multi-Format Support**: Audio (MP3, WAV, FLAC, M4A, AAC, OGG) and Video (MP4, AVI, MOV, MKV, WebM, FLV)
- **Real-time Processing**: Live progress tracking with detailed status updates

### 🎨 Modern Interface
- **Glassmorphism Design**: Beautiful, modern UI with blur effects and smooth animations
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Dark Theme**: Eye-friendly interface optimized for long working sessions
- **Drag & Drop**: Intuitive file upload with visual feedback
- **Search & Export**: Full-text search in transcripts and multiple export formats

### 🔒 Privacy & Performance
- **Local Processing**: Your data stays on your machine (optional cloud processing for large files)
- **GPU Acceleration**: Automatic CUDA support for faster processing
- **Scalable Architecture**: Built for handling large meetings (1+ hours)
- **Background Processing**: Non-blocking async processing with job tracking

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (3.10+ recommended)
- **Git**
- **FFmpeg** (for audio/video processing)
- **CUDA** (optional, for GPU acceleration)

### Option A: Simple Server (Fastest Setup) ⚡

Perfect for getting started quickly with core transcription features:

```bash
# 1. Clone or download the repository
git clone https://github.com/your-username/meeting-ai.git
cd meeting-ai

# 2. Install minimal dependencies
pip install fastapi uvicorn faster-whisper soundfile

# 3. Start the simple server
python simple_server.py

# 4. Open browser to http://localhost:8000
```

**Features included in Simple Server:**
- ✅ Whisper Large-v3 transcription
- ✅ Beautiful glassmorphism web UI
- ✅ Drag & drop file upload
- ✅ Multi-format audio/video support
- ✅ Enhanced transcription pipeline
- ✅ Word-level timestamps

### Option B: Full Features (Complete Setup) 🎯

For advanced features like speaker diarization and AI summaries:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/meeting-ai.git
cd meeting-ai
```

### 2. Set Up Python Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\\Scripts\\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt
```

### 3. Install System Dependencies

#### Windows
```bash
# Install FFmpeg via chocolatey (or download from https://ffmpeg.org/)
choco install ffmpeg

# Or download manually and add to PATH
```

#### macOS
```bash
# Install FFmpeg via Homebrew
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
# Install FFmpeg
sudo apt update
sudo apt install ffmpeg

# For CUDA support (optional)
sudo apt install nvidia-cuda-toolkit
```

### 4. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
HUGGINGFACE_TOKEN=your_huggingface_token_here
```

**Getting HuggingFace Token:**
1. Visit [HuggingFace](https://huggingface.co/) and create an account
2. Go to Settings → Access Tokens
3. Create a new token with READ permissions
4. Copy the token to your `.env` file

*Note: The token is required for speaker diarization in the full app. The simple server works without it.*

### 5. Run the Application

**Option A: Simple Server (Fastest)**
```bash
# From the main directory
python simple_server.py
```

**Option B: Full Application**
```bash
# From the backend directory
python app.py
```

The application will start on `http://localhost:8000`

### 6. Open in Browser

Navigate to `http://localhost:8000` in your web browser to access the Meeting AI interface.

## 📁 Project Structure

```
meeting-ai/
├── simple_server.py          # 🚀 Quick start server (Recommended for beginners)
├── backend/
│   ├── app.py                # FastAPI main application (Full features)
│   ├── transcriber.py        # Enhanced Whisper transcription engine
│   ├── diarizer.py          # Speaker diarization with pyannote
│   ├── summarizer.py        # AI-powered summarization
│   ├── dataset_loader.py    # HuggingFace dataset management
│   ├── utils.py             # Utility functions and helpers
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main UI interface (Full app)
│   ├── style.css            # Glassmorphism styling
│   └── script.js            # Frontend logic and API calls
├── models/                  # AI model cache directory
├── data/                    # Training datasets storage
├── outputs/                 # Processed results storage
├── config.yaml              # Configuration file
├── start.bat               # Windows start script
├── start.sh                # Linux/macOS start script
└── README.md               # This documentation
```

### File Descriptions

#### Quick Start Files
- **`simple_server.py`** - 🚀 **Standalone web server with embedded UI**
  - Perfect for beginners and quick testing
  - Includes beautiful glassmorphism interface
  - Enhanced Whisper large-v3 transcription
  - Minimal dependencies beyond core AI models
  - **Just run: `python simple_server.py`**

#### Core Backend Files  
- **`backend/app.py`** - 🎯 **Full-featured FastAPI application**
  - Complete meeting analysis pipeline
  - Speaker diarization and AI summarization
  - Background job processing
  - RESTful API endpoints

- **`backend/transcriber.py`** - 🎵 **Enhanced transcription engine**
  - Multiple Whisper model support (tiny to large-v3)
  - Optimized processing pipeline
  - CPU and GPU acceleration
  - Word-level timestamping

#### Configuration Files
- **`config.yaml`** - ⚙️ **Central configuration**
  - Model settings and paths
  - Processing parameters
  - Performance tuning options

- **`start.bat/start.sh`** - 🖥️ **Platform-specific launchers**
  - Automated environment setup
  - Dependency checking
  - Service initialization

## 🔧 Configuration Options

### Simple Server Configuration

The `simple_server.py` uses sensible defaults but can be customized:

```python
# Enhanced Whisper Settings (in simple_server.py)
MODEL_SIZE = "large-v3"        # Model: tiny, base, small, medium, large, large-v3
DEVICE = "cpu"                 # Device: "cpu", "cuda", "auto"
COMPUTE_TYPE = "int8"          # Precision: "int8", "float16", "float32"
BEAM_SIZE = 5                  # Beam search size (1-10, higher = better quality)
VAD_FILTER = True              # Voice activity detection
WORD_TIMESTAMPS = True         # Word-level timing
```

### Advanced Configuration (config.yaml)

For the full application, create or edit `config.yaml`:

```yaml
models:
  asr: "large-v3"                    # Whisper model size
  diarization: "pyannote/speaker-diarization-3.1"

processing:
  device: "auto"                     # "cpu", "cuda", or "auto"
  compute_type: "int8"               # "int8", "float16", "float32"
  beam_size: 5                       # Transcription beam size
  vad_filter: true                   # Voice activity detection
  word_timestamps: true              # Word-level timestamps

audio:
  sample_rate: 16000                 # Audio sample rate
  channels: 1                        # Mono audio

server:
  host: "0.0.0.0"                   # Server host
  port: 8000                         # Server port
```

### Model Settings
You can customize the AI models by editing the initialization parameters:

```python
# In app.py startup_event()
transcription_success = await initialize_transcription_engine("medium")  # tiny, base, small, medium, large, large-v2, large-v3
summarizer_success = await initialize_summarizer("facebook/bart-large-cnn")  # Other models: microsoft/DialoGPT-large, google/pegasus-xsum
```

### Supported Models

#### Transcription (Whisper)
- `tiny`: Fastest, lowest accuracy (~39 MB)
- `base`: Balanced speed/accuracy (~74 MB)
- `small`: Good accuracy (~244 MB)
- `medium`: **Recommended** (~769 MB)
- `large`: Highest accuracy (~1550 MB)
- `large-v2`: Enhanced large model
- `large-v3`: Latest large model

#### Summarization
- `facebook/bart-large-cnn`: **Default** - Excellent for meetings
- `microsoft/DialoGPT-large`: Better for conversational content
- `google/pegasus-xsum`: Abstractive summarization
- `t5-base`: General purpose summarization

### API Configuration

The backend exposes several REST endpoints:

- `POST /upload` - Upload and process meeting files
- `GET /status/{job_id}` - Check processing status
- `GET /results/{job_id}` - Get complete results
- `GET /download/{job_id}/{format}` - Download results (json, txt, srt)
- `GET /health` - Service health check
- `GET /models/info` - Model information

## 🎯 Usage Guide

### Simple Server Interface (simple_server.py)

The quickest way to start transcribing:

1. **Start the Server**
   ```bash
   python simple_server.py
   ```

2. **Access the Web Interface**
   - Open browser to `http://localhost:8000`
   - You'll see a beautiful glassmorphism interface

3. **Upload & Transcribe**
   - **Drag & Drop**: Simply drag audio/video files onto the upload area
   - **Click Upload**: Use the file selector button
   - **Supported Formats**: MP3, WAV, FLAC, M4A, AAC, OGG, MP4, AVI, MOV, MKV
   - **File Size**: Up to 2GB per file

4. **Get Results**
   - Click "🚀 Transcribe Audio" 
   - View live processing status
   - Get high-quality transcript with timestamps
   - See language detection and quality metrics

**Simple Server Features:**
- ✅ **Enhanced Whisper Large-v3**: State-of-the-art accuracy
- ✅ **99+ Language Support**: Automatic language detection
- ✅ **Word Timestamps**: Precise timing information
- ✅ **Quality Metrics**: Transcription confidence scores
- ✅ **Modern UI**: Glassmorphism design with animations
- ✅ **Real-time Feedback**: Live processing updates

### Full Application Interface (app.py)

For complete features including speaker diarization and AI summaries:

### 1. File Upload
- **Drag & Drop**: Simply drag your meeting file onto the upload area
- **File Browser**: Click "Select File" to choose from your computer
- **Supported Formats**: Audio (MP3, WAV, FLAC, M4A, AAC, OGG) and Video (MP4, AVI, MOV, MKV, WebM, FLV)
- **Size Limit**: Up to 2GB per file

### 2. Processing Options
- **Language**: Auto-detect or specify (95+ languages supported)
- **Speaker Count**: Set minimum/maximum expected speakers for better diarization
- **Summary Type**: 
  - **Brief**: Quick overview (<150 words)
  - **Comprehensive**: Detailed summary (150-300 words) - *Recommended*
  - **Detailed**: In-depth analysis (300-500 words)

### 3. Results Analysis

#### Summary
- Comprehensive meeting overview
- Key decisions and outcomes
- Important discussion points

#### Key Points
- Bullet-point highlights
- Critical information extraction
- Topic identification

#### Action Items
- Automatic task detection
- Assignee identification (when mentioned)
- Deadline extraction
- Priority assessment

#### Speaker Analysis
- Individual participation statistics
- Speaking time distribution
- Contribution analysis

#### Full Transcript
- Speaker-labeled transcript with timestamps
- Searchable content
- Copy/export functionality

### 4. Export Options
- **JSON**: Complete structured data
- **TXT**: Formatted text report
- **SRT**: Subtitle file for video players

## 🛠️ Advanced Configuration

### GPU Acceleration

For faster processing, ensure CUDA is installed:

```bash
# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# Install CUDA-enabled PyTorch (if needed)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Custom Model Paths

You can specify custom model cache directories:

```python
# In utils.py ConfigManager class
@staticmethod
def get_model_cache_dir() -> Path:
    cache_dir = Path("path/to/your/models")
    cache_dir.mkdir(exist_ok=True)
    return cache_dir
```

### Performance Tuning

For large files or limited resources:

```python
# In transcriber.py
transcription_engine = TranscriptionEngine("small")  # Use smaller model

# In summarizer.py  
meeting_summarizer = MeetingSummarizer("facebook/bart-base")  # Use base model

# Adjust batch sizes in app.py for GPU memory optimization
```

## 🔍 Troubleshooting

### Simple Server (simple_server.py) Issues

#### Server Won't Start
```bash
# Check if port 8000 is available
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # macOS/Linux

# Use different port if needed
python simple_server.py --port 8001
```

#### Model Download Issues
```bash
# Clear model cache and retry
rm -rf models/
python simple_server.py

# Check internet connection and disk space (need 3GB+ for large-v3)
```

#### Audio Processing Errors
```bash
# Install FFmpeg if not present
# Windows: Download from https://ffmpeg.org/
# macOS: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg

# For M4A/AAC files, ensure FFmpeg has AAC support
ffmpeg -codecs | grep aac
```

#### Performance Issues
```python
# In simple_server.py, change model size:
MODEL_SIZE = "medium"  # Instead of "large-v3"
COMPUTE_TYPE = "int8"  # For CPU optimization
BEAM_SIZE = 3         # Faster but less accurate
```

### Full Application Issues

#### 1. **Module Import Errors**
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
venv\\Scripts\\activate   # Windows

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

#### 2. **FFmpeg Not Found**
```bash
# Windows: Add FFmpeg to PATH or install via chocolatey
choco install ffmpeg

# macOS: Install via Homebrew
brew install ffmpeg

# Linux: Install via package manager
sudo apt install ffmpeg
```

#### 3. **CUDA Out of Memory**
```python
# Switch to CPU processing or smaller models
device = "cpu"  # Force CPU usage
model_size = "base"  # Use smaller model
```

#### 4. **HuggingFace Authentication**
```bash
# Ensure token is in .env file
echo "HUGGINGFACE_TOKEN=your_token_here" > backend/.env

# Or set environment variable
export HUGGINGFACE_TOKEN=your_token_here
```

#### 5. **Port Already in Use**
```bash
# Use different port
uvicorn app:app --host 0.0.0.0 --port 8001
```

### Performance Optimization

#### For Low-Memory Systems:
- Use `tiny` or `base` Whisper models
- Reduce `max_speakers` parameter
- Process shorter audio segments

#### For High-Performance Systems:
- Use `large-v3` Whisper model
- Enable GPU acceleration
- Increase batch sizes
- Use faster summarization models

### Debug Mode

Enable detailed logging:

```python
# In app.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🧪 Development

### Setting Up Development Environment

```bash
# Install development dependencies
pip install -r requirements.txt
pip install pytest black flake8 mypy

# Run tests
pytest tests/

# Format code
black backend/
flake8 backend/

# Type checking
mypy backend/
```

### API Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test file upload
curl -X POST -F "file=@test_meeting.mp3" http://localhost:8000/upload

# Test status check
curl http://localhost:8000/status/job_id_here
```

### Frontend Development

The frontend is built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance.

Key features:
- Glassmorphism design with CSS backdrop-filter
- Smooth animations with CSS transitions
- Responsive grid layouts
- Modern JavaScript ES6+ features
- Fetch API for backend communication

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Requirements

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB for models, 10GB+ recommended for datasets
- **GPU**: Optional but recommended (NVIDIA with CUDA support)

### Python Dependencies
See [requirements.txt](backend/requirements.txt) for complete list. Key dependencies:
- FastAPI 0.104.1+ (Web framework)
- faster-whisper 0.10.0+ (Speech recognition)
- pyannote.audio 3.1.1+ (Speaker diarization)
- transformers 4.35.2+ (AI summarization)
- torch 2.1.0+ (Deep learning framework)

## 🔮 Roadmap

### Version 2.0 (Coming Soon)
- [ ] Real-time transcription from live audio
- [ ] Multi-language meetings support
- [ ] Advanced speaker identification with voice biometrics
- [ ] Integration with popular meeting platforms (Zoom, Teams, Meet)
- [ ] Custom vocabulary and terminology support
- [ ] Meeting analytics and insights dashboard

### Version 3.0 (Future)
- [ ] AI-powered meeting scheduling suggestions
- [ ] Sentiment analysis of meeting participants
- [ ] Automatic meeting minutes generation
- [ ] Custom AI model training for domain-specific terminology
- [ ] Enterprise SSO integration
- [ ] Meeting recordings search and indexing

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) for the amazing speech recognition capabilities
- [pyannote.audio](https://github.com/pyannote/pyannote-audio) for speaker diarization
- [Hugging Face](https://huggingface.co/) for transformer models and datasets
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent web framework
- The open-source community for their invaluable contributions

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-username/meeting-ai/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/meeting-ai/issues)
- **Discord**: [Community Chat](https://discord.gg/meeting-ai)
- **Email**: support@meeting-ai.com

---

<div align="center">
  <p>Made with ❤️ for better meetings</p>
  <p>
    <a href="https://github.com/your-username/meeting-ai/stargazers">⭐ Star</a> •
    <a href="https://github.com/your-username/meeting-ai/fork">🔀 Fork</a> •
    <a href="https://github.com/your-username/meeting-ai/issues">🐛 Report Bug</a> •
    <a href="https://github.com/your-username/meeting-ai/issues">💡 Request Feature</a>
  </p>
</div>
