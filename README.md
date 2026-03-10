# 🎥 AI Meet – Video Conferencing with AI Intelligence

![AI Meet](https://img.shields.io/badge/AI%20Meet-Video%20Conferencing-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333?style=flat-square)

A full-featured video conferencing platform inspired by Google Meet, with built-in AI-powered transcription, pain point detection, sentiment analysis, and meeting recording.

## ✨ Features

### 🎯 Google Meet-style Meeting Options
- **Create a meeting for later** – Generate a shareable link instantly
- **Start an instant meeting** – Jump straight into a call
- **Schedule in Calendar** – Pre-fill date & time for future meetings

### 📹 Video Conferencing
- WebRTC peer-to-peer video & audio calls
- Screen sharing
- In-call chat messaging
- Emoji reactions & hand raise
- Live captions (Web Speech API)
- Host controls with waiting room (admit/deny participants)
- **Add people** – Share invite link directly from the meeting

### 🎬 Meeting Recordings
- One-click recording during meetings
- Recordings auto-uploaded and stored on the server
- Playback and download from the Dashboard
- Recording player in Meeting Summary page

### 🤖 AI Intelligence
- **Real-time transcription** – Live captions stored as transcripts
- **Pain point detection** – Automatic issue identification during calls
- **Action item extraction** – Tasks, assignees, and priorities
- **Sentiment analysis** – Overall meeting mood & satisfaction scores
- **Sarvam AI integration** – Optional advanced transcription

### 📊 Analytics Dashboard
- View all meetings (live, ended, all)
- Meeting recordings with playback
- Participant counts & duration tracking
- Click through to detailed meeting insights

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (3.10+ recommended)
- **Node.js 18+** & npm

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Start Both Services

```bash
# Terminal 1 – Backend (from project root)
python start_server.py

# Terminal 2 – Frontend
cd frontend && npm run dev
```

### 4. Open Browser

Navigate to **http://localhost:3000**

## 📁 Project Structure

```
video/
├── start_server.py        # Backend server launcher
├── start.sh               # Convenience start script
├── config.yaml            # Configuration file
├── backend/               # FastAPI + Socket.IO backend
│   ├── app_meeting.py     # Main server (REST + WebSocket)
│   ├── requirements.txt   # Python dependencies
│   ├── database/          # SQLAlchemy models & DB setup
│   ├── services/          # AI processing services
│   └── data/              # SQLite DB & recordings storage
└── frontend/              # React + Vite frontend
    ├── package.json       # Node dependencies
    ├── vite.config.ts     # Vite config (proxy to backend)
    └── src/               # React components & styles
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for detailed docs.

## 🔧 Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SARVAM_API_KEY` | Sarvam AI transcription API key | Optional |
| `HUGGINGFACE_TOKEN` | HuggingFace token for AI models | Optional |

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (FastAPI) | 8000 | http://127.0.0.1:8000 |

## 📝 License

MIT
