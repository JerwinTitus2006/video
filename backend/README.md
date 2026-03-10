# AI Meet – Backend

FastAPI + Socket.IO backend for the AI Meet video conferencing platform.

## Tech Stack

- **FastAPI** – REST API framework
- **Python-SocketIO** – Real-time WebSocket events (signaling, chat, captions)
- **SQLAlchemy** (async) + **aiosqlite** – SQLite database (zero-config)
- **Uvicorn** – ASGI server
- **Sarvam AI** – Optional AI transcription service
- **NLP Pipeline** – Pain point detection, sentiment analysis, action items

## Project Structure

```
backend/
├── app_meeting.py         # Main server: FastAPI routes + Socket.IO events
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (API keys)
├── .env.example           # Template for .env
├── transcriber.py         # Whisper-based transcription
├── diarizer.py            # Speaker diarization
├── summarizer.py          # Meeting summarization
├── utils.py               # Utility functions
├── dataset_loader.py      # Dataset loading helpers
├── database/
│   ├── __init__.py
│   ├── database.py        # Async SQLAlchemy engine & session
│   └── models.py          # ORM models (Meeting, Transcript, PainPoint, etc.)
├── services/
│   ├── __init__.py
│   ├── ai_processor.py    # Full NLP pipeline (pain points, actions, sentiment)
│   └── sarvam_ai.py       # Sarvam AI transcription service
└── data/
    ├── meetings.db        # SQLite database (auto-created)
    └── recordings/        # Stored meeting recordings (auto-created)
```

## API Endpoints

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new meeting room |
| GET | `/api/rooms/{room_id}` | Check if a room exists |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | List all meetings (filter by `?status=live\|ended`) |
| GET | `/api/meetings/{id}` | Get meeting details |
| GET | `/api/meetings/{id}/transcripts` | Get meeting transcripts |
| GET | `/api/meetings/{id}/pain-points` | Get detected pain points |
| GET | `/api/meetings/{id}/action-items` | Get extracted action items |
| GET | `/api/meetings/{id}/sentiment` | Get sentiment analysis |
| POST | `/api/meetings/{id}/recording` | Upload meeting recording |
| GET | `/api/meetings/{id}/recording` | Download/stream recording |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/docs` | Swagger API documentation |

## Socket.IO Events

### Client → Server
| Event | Description |
|-------|-------------|
| `join_room` | Join a meeting room |
| `leave_room` | Leave a meeting room |
| `offer` / `answer` / `ice_candidate` | WebRTC signaling |
| `toggle_audio` / `toggle_video` | Toggle media |
| `screen_share` | Toggle screen sharing |
| `chat_message` | Send chat message |
| `hand_raise` | Toggle hand raise |
| `reaction` | Send emoji reaction |
| `caption` | Send live caption text |
| `end_meeting` | End meeting & trigger AI processing |
| `admit_participant` / `deny_participant` / `admit_all` | Host controls |

### Server → Client
| Event | Description |
|-------|-------------|
| `room_joined` | Successfully joined room |
| `participant_joined` / `participant_left` | Participant changes |
| `chat_message` | New chat message |
| `new_transcript` | New transcript entry |
| `pain_point_detected` | Real-time pain point alert |
| `processing_complete` | AI processing finished |
| `waiting_room_update` | Waiting room changes (host) |

## Getting Started

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env with your API keys

# Run server
cd ..
python start_server.py
```

The server runs on **http://127.0.0.1:8000**.

## Database

Uses SQLite (zero configuration). The database file is auto-created at `data/meetings.db` on first run. Meeting recordings are stored in `data/recordings/`.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SARVAM_API_KEY` | Sarvam AI API key for transcription | Optional |
| `HUGGINGFACE_TOKEN` | HuggingFace token for pyannote models | Optional |
| `PORT` | Server port (default: 8000) | No |
| `DEBUG` | Enable debug mode | No |
