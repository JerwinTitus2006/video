# AI Call Intelligence Backend

AI-powered call intelligence platform built with **FastAPI**, **PostgreSQL + pgvector**, and modern NLP/ML models.

## Features

| # | Function | Endpoint | Description |
|---|----------|----------|-------------|
| 1 | Jitsi Webhook | `POST /api/v1/webhooks/jitsi/recording` | Receives recording, triggers full AI pipeline |
| 2 | WhisperX Transcription | Service layer | Speech-to-text with speaker diarization |
| 3 | Speaker Identification | Service layer | Voice embedding comparison (cosine similarity) |
| 4 | Pain Point Extraction | `POST /api/v1/ai/extract_pain_points` | RoBERTa NER → PROBLEM/REQUEST/COMPLAINT |
| 5 | Resource Matching | `POST /api/v1/ai/match_resources` | SBERT + pgvector + Llama3 reranking |
| 6 | Action Item Generation | `POST /api/v1/ai/generate_actions` | Llama3-8B structured task generation |
| 7 | Sentiment Analysis | `POST /api/v1/ai/analyze_sentiment` | Multilingual BERT per-speaker scoring |
| 8 | Multi-Meeting Analytics | `GET /api/v1/analytics/person/{id}` | Pain point freq, sentiment trends, health score |
| 9 | QBR Report Generation | `POST /api/v1/reports/generate_qbr` | HTML → PDF with email delivery |
| 10 | Notification Engine | Celery Beat | Overdue scan, pain point alerts, QBR prep |
| 11 | CRUD APIs | `/api/v1/meetings`, `/persons`, etc. | Full CRUD for all entities |
| 12 | WebSocket | `WS /live/{meeting_id}` | Real-time sentiment, pain points, actions |
| 13 | Search & Filtering | `/api/v1/search/*` | Full-text + vector similarity + filters |
| 14 | Background Processing | Celery workers | Long-running jobs, model inference queue |

## Tech Stack

- **Backend**: FastAPI (async Python)
- **Database**: PostgreSQL + pgvector (vector similarity)
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Background Tasks**: Celery + Redis
- **AI/ML**: WhisperX, RoBERTa, SBERT, Llama3, Multilingual BERT
- **Reports**: Jinja2 + WeasyPrint (HTML → PDF)

## Quick Start

### 1. Prerequisites

```bash
# PostgreSQL with pgvector extension
sudo apt install postgresql
# Install pgvector: https://github.com/pgvector/pgvector

# Redis (for Celery)
sudo apt install redis-server

# Python 3.11+
python --version
```

### 2. Database Setup

```sql
CREATE DATABASE ai_call_intelligence;
\c ai_call_intelligence
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. API Docs

Open [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger UI.

### 7. Celery Workers (optional)

```bash
# Start worker
celery -A app.tasks.celery_app worker --loglevel=info

# Start beat scheduler
celery -A app.tasks.celery_app beat --loglevel=info
```

## Project Structure

```
app/
├── main.py              # FastAPI entry point
├── config.py            # Settings (pydantic-settings)
├── database.py          # Async SQLAlchemy
├── models/              # ORM models (7 tables + associations)
├── schemas/             # Pydantic request/response schemas
├── routers/             # API route handlers (12 routers)
├── services/            # Business logic & AI services (8 services)
└── tasks/               # Celery background tasks
```

## API Endpoints Overview

- **Health**: `GET /health`
- **Webhooks**: `POST /api/v1/webhooks/jitsi/recording`
- **CRUD**: `/api/v1/{meetings,persons,pain_points,resources,action_items,sentiment_segments,reports}`
- **AI**: `/api/v1/ai/{extract_pain_points,match_resources,generate_actions,analyze_sentiment}`
- **Analytics**: `/api/v1/analytics/{person/{id},meeting/{id},dashboard}`
- **Search**: `/api/v1/search/{full_text,vector_similarity,filtered}`
- **WebSocket**: `WS /live/{meeting_id}`
- **Reports**: `POST /api/v1/reports/generate_qbr`
