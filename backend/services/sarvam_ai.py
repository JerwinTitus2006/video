import httpx
import os
import logging
from dotenv import load_dotenv
from typing import Optional, Dict

load_dotenv()
logger = logging.getLogger("ai-meet.sarvam")


class SarvamAIService:
    def __init__(self):
        self.api_key = os.getenv("SARVAM_API_KEY")
        self.base_url = "https://api.sarvam.ai"
        self.max_retries = 3
        self.timeout = 30.0

        if not self.api_key or self.api_key == "your-sarvam-api-key-here":
            logger.warning(
                "⚠️  SARVAM_API_KEY not set – real-time Sarvam transcription disabled. "
                "Browser Web-Speech-API captions will still work."
            )

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language: str = "en-IN",
        with_timestamps: bool = False,
    ) -> Optional[Dict]:
        """
        Transcribe audio using the Sarvam AI speech-to-text API.

        Args:
            audio_bytes:  Raw audio bytes (WAV format preferred).
            language:     BCP-47 language code (en-IN, hi-IN, ta-IN …).
            with_timestamps: Include word-level timestamps.

        Returns:
            dict with keys transcript, confidence, language, timestamps (or None).
        """
        if not self.api_key or self.api_key == "your-sarvam-api-key-here":
            return None

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
                    data = {"model": "saaras:v1", "language_code": language}
                    if with_timestamps:
                        data["with_timestamps"] = "true"
                    headers = {"api-subscription-key": self.api_key}

                    response = await client.post(
                        f"{self.base_url}/speech-to-text-translate",
                        files=files,
                        data=data,
                        headers=headers,
                    )
                    response.raise_for_status()
                    result = response.json()

                    logger.info(
                        "✅ Sarvam AI transcription OK (attempt %d)", attempt + 1
                    )
                    return {
                        "transcript": result.get("transcript", ""),
                        "confidence": result.get("confidence", 0.9),
                        "language": language,
                        "timestamps": (
                            result.get("timestamps", []) if with_timestamps else None
                        ),
                    }

            except httpx.HTTPStatusError as exc:
                logger.error(
                    "❌ Sarvam API %s (attempt %d)",
                    exc.response.status_code,
                    attempt + 1,
                )
                if attempt == self.max_retries - 1:
                    return None

            except Exception as exc:
                logger.error("❌ Transcription error (attempt %d): %s", attempt + 1, exc)
                if attempt == self.max_retries - 1:
                    return None

        return None


# Singleton
sarvam_service = SarvamAIService()
