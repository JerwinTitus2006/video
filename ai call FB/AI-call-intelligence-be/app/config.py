"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_call_intelligence"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_PATH: str = "./storage"

    # AI APIs
    OPENAI_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    SARVAM_API_KEY: str = ""

    # AI Models (fallback for local models)
    WHISPERX_MODEL: str = "large-v2"
    SBERT_MODEL: str = "all-MiniLM-L6-v2"
    SPEAKER_SIMILARITY_THRESHOLD: float = 0.85

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # App
    APP_NAME: str = "AI Call Intelligence"
    DEBUG: bool = True

    # ── Jitsi Meet Integration ──────────────────────────────────────────────────
    # Public URL of the Jitsi server (web container). Used to build room URLs.
    JITSI_DOMAIN: str = "meet.jitsi"
    # Optional JWT app credentials (set ENABLE_AUTH=1 in Jitsi .env to require tokens)
    JITSI_APP_ID: str = ""
    JITSI_APP_SECRET: str = ""
    # Shared secret for Prosody → backend webhook calls (must match WEBHOOK_SECRET
    # in the Jitsi .env / mod_conference_webhook.lua config)
    JITSI_WEBHOOK_SECRET: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
