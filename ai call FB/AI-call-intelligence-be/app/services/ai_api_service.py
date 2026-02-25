"""AI API Service - Uses external APIs (OpenAI, Deepgram) instead of local models.

This service provides:
1. Transcription with speaker diarization (Deepgram/OpenAI Whisper API)
2. Pain point extraction (OpenAI GPT)
3. Sentiment analysis (OpenAI GPT)
4. Solution generation (OpenAI GPT)
5. Action item generation (OpenAI GPT)
6. Meeting summary generation (OpenAI GPT)
"""

import json
import logging
import os
from typing import Any, Optional
import uuid
from datetime import datetime

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AIAPIService:
    """Service for AI processing using external APIs."""

    def __init__(self):
        self.openai_api_key = settings.OPENAI_API_KEY
        self.deepgram_api_key = settings.DEEPGRAM_API_KEY
        self.sarvam_api_key = settings.SARVAM_API_KEY
        self.openai_base_url = "https://api.openai.com/v1"
        self.deepgram_base_url = "https://api.deepgram.com/v1"

    # ═══════════════════════════════════════════════════════════════════════════
    # TRANSCRIPTION
    # ═══════════════════════════════════════════════════════════════════════════

    async def transcribe_audio(
        self,
        audio_path: str,
        use_deepgram: bool = True,
        language: str = "en"
    ) -> dict[str, Any]:
        """
        Transcribe audio file with speaker diarization.
        
        Args:
            audio_path: Path to audio/video file
            use_deepgram: If True, use Deepgram; else use OpenAI Whisper
            language: Language code (e.g., 'en', 'hi', 'ta')
        
        Returns:
            {
                "full_text": str,
                "segments": [
                    {"speaker": "SPEAKER_0", "text": "...", "start": 0.0, "end": 1.5},
                    ...
                ],
                "duration": float
            }
        """
        if use_deepgram and self.deepgram_api_key:
            return await self._transcribe_with_deepgram(audio_path, language)
        elif self.openai_api_key:
            return await self._transcribe_with_openai(audio_path, language)
        else:
            raise ValueError("No API key configured for transcription")

    async def _transcribe_with_deepgram(self, audio_path: str, language: str) -> dict:
        """Transcribe using Deepgram API with diarization."""
        url = f"{self.deepgram_base_url}/listen"
        
        params = {
            "model": "nova-2",
            "smart_format": "true",
            "diarize": "true",
            "punctuate": "true",
            "paragraphs": "true",
            "utterances": "true",
            "language": language,
        }

        headers = {
            "Authorization": f"Token {self.deepgram_api_key}",
            "Content-Type": "audio/mp4",  # Adjust based on file type
        }

        # Read audio file
        with open(audio_path, "rb") as f:
            audio_data = f.read()

        async with httpx.AsyncClient(timeout=600) as client:
            response = await client.post(
                url,
                params=params,
                headers=headers,
                content=audio_data
            )
            response.raise_for_status()
            result = response.json()

        # Parse Deepgram response into our format
        segments = []
        full_text_parts = []

        utterances = result.get("results", {}).get("utterances", [])
        for utt in utterances:
            segment = {
                "speaker": f"SPEAKER_{utt.get('speaker', 0)}",
                "text": utt.get("transcript", ""),
                "start": utt.get("start", 0.0),
                "end": utt.get("end", 0.0),
                "confidence": utt.get("confidence", 0.0),
            }
            segments.append(segment)
            full_text_parts.append(f"[{segment['speaker']}]: {segment['text']}")

        # Get duration from metadata
        duration = result.get("metadata", {}).get("duration", 0.0)

        return {
            "full_text": "\n".join(full_text_parts),
            "segments": segments,
            "duration": duration,
            "raw_response": result,
        }

    async def _transcribe_with_openai(self, audio_path: str, language: str) -> dict:
        """Transcribe using OpenAI Whisper API."""
        url = f"{self.openai_base_url}/audio/transcriptions"

        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
        }

        # Read audio file
        with open(audio_path, "rb") as f:
            files = {
                "file": (os.path.basename(audio_path), f, "audio/mp4"),
                "model": (None, "whisper-1"),
                "response_format": (None, "verbose_json"),
                "language": (None, language),
                "timestamp_granularities[]": (None, "segment"),
            }

            async with httpx.AsyncClient(timeout=600) as client:
                response = await client.post(url, headers=headers, files=files)
                response.raise_for_status()
                result = response.json()

        # Parse OpenAI response (note: Whisper API doesn't do diarization natively)
        segments = []
        for seg in result.get("segments", []):
            segment = {
                "speaker": "SPEAKER_0",  # OpenAI doesn't provide speaker diarization
                "text": seg.get("text", "").strip(),
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
            }
            segments.append(segment)

        return {
            "full_text": result.get("text", ""),
            "segments": segments,
            "duration": result.get("duration", 0.0),
            "raw_response": result,
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # PAIN POINT EXTRACTION
    # ═══════════════════════════════════════════════════════════════════════════

    async def extract_pain_points(
        self,
        transcript: str,
        segments: list[dict] = None
    ) -> list[dict]:
        """
        Extract pain points from transcript using GPT.
        
        Returns:
            [
                {
                    "text": "The delivery was delayed by 2 weeks",
                    "label": "PROBLEM",
                    "speaker": "SPEAKER_1",
                    "start": 45.2,
                    "end": 48.5,
                    "severity": "high"
                },
                ...
            ]
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        system_prompt = """You are an AI that analyzes meeting transcripts to identify pain points.
        
A pain point is any:
- PROBLEM: Issues, bugs, errors, delays, failures mentioned
- REQUEST: Specific asks, needs, requirements from participants
- COMPLAINT: Expressions of frustration, disappointment, or dissatisfaction

For each pain point found, extract:
- text: The exact quote or paraphrased issue
- label: One of "PROBLEM", "REQUEST", or "COMPLAINT"
- speaker: The speaker ID if available
- severity: "high", "medium", or "low"
- context: Brief context about what triggered this

Return your response as a JSON array."""

        user_prompt = f"""Analyze this meeting transcript and extract all pain points:

{transcript}

Return a JSON array with all pain points found. If no pain points, return an empty array []."""

        response = await self._call_openai_chat(system_prompt, user_prompt)
        
        try:
            # Parse JSON from response
            pain_points = json.loads(response)
            if not isinstance(pain_points, list):
                pain_points = []
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                pain_points = json.loads(json_match.group())
            else:
                pain_points = []

        return pain_points

    # ═══════════════════════════════════════════════════════════════════════════
    # SENTIMENT ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════

    async def analyze_sentiment(
        self,
        transcript: str,
        segments: list[dict] = None
    ) -> dict[str, Any]:
        """
        Analyze sentiment of meeting transcript.
        
        Returns:
            {
                "overall_score": 0.65,  # -1.0 to 1.0
                "overall_label": "positive",
                "segments": [
                    {"speaker": "SPEAKER_0", "text": "...", "score": 0.8, "label": "positive"},
                    ...
                ],
                "per_speaker": {
                    "SPEAKER_0": {"avg_score": 0.7, "label": "positive"},
                    ...
                }
            }
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        system_prompt = """You are an AI that analyzes meeting sentiment.

For each speaker segment, determine:
- score: A float from -1.0 (very negative) to 1.0 (very positive)
- label: "positive", "negative", or "neutral"

Also provide:
- overall_score: Average sentiment of the meeting
- per_speaker: Sentiment breakdown by speaker

Return your response as JSON."""

        user_prompt = f"""Analyze the sentiment of this meeting transcript:

{transcript}

Return JSON with:
- overall_score (float -1 to 1)
- overall_label (string)
- segments (array with speaker, text, score, label)
- per_speaker (object with speaker IDs as keys)"""

        response = await self._call_openai_chat(system_prompt, user_prompt)
        
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {"overall_score": 0.0, "overall_label": "neutral", "segments": [], "per_speaker": {}}

        return result

    # ═══════════════════════════════════════════════════════════════════════════
    # SOLUTION GENERATION
    # ═══════════════════════════════════════════════════════════════════════════

    async def generate_solutions(
        self,
        pain_points: list[dict],
        context: str = ""
    ) -> list[dict]:
        """
        Generate solutions for identified pain points.
        
        Returns:
            [
                {
                    "pain_point_text": "The delivery was delayed",
                    "solutions": [
                        {
                            "title": "Implement tracking system",
                            "description": "Set up real-time delivery tracking...",
                            "priority": "high",
                            "effort": "medium"
                        }
                    ]
                },
                ...
            ]
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        if not pain_points:
            return []

        system_prompt = """You are an AI solution architect that provides actionable solutions for business problems.

For each pain point, generate 1-3 practical solutions that include:
- title: Brief solution title
- description: Detailed description of the solution
- priority: "high", "medium", or "low"
- effort: "high", "medium", or "low" (implementation effort)
- expected_outcome: What improvement to expect

Focus on:
- Immediate quick wins
- Long-term strategic solutions
- Cost-effective approaches

Return your response as a JSON array."""

        pain_points_text = "\n".join([
            f"- [{p.get('label', 'ISSUE')}] {p.get('text', '')}"
            for p in pain_points
        ])

        user_prompt = f"""Generate solutions for these pain points from a meeting:

{pain_points_text}

Additional context:
{context}

Return a JSON array with solutions for each pain point."""

        response = await self._call_openai_chat(system_prompt, user_prompt)
        
        try:
            solutions = json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                solutions = json.loads(json_match.group())
            else:
                solutions = []

        return solutions

    # ═══════════════════════════════════════════════════════════════════════════
    # ACTION ITEM GENERATION
    # ═══════════════════════════════════════════════════════════════════════════

    async def generate_action_items(
        self,
        transcript: str,
        pain_points: list[dict] = None
    ) -> list[dict]:
        """
        Generate action items from transcript.
        
        Returns:
            [
                {
                    "description": "Follow up with vendor about delivery timeline",
                    "owner": "John (suggested)",
                    "due_date": "2024-02-28",
                    "priority": "high",
                    "related_pain_point": "Delivery delays"
                },
                ...
            ]
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        system_prompt = """You are an AI meeting assistant that extracts action items.

For each action item, provide:
- description: Clear, actionable task description
- owner: Person responsible (if mentioned, otherwise "TBD")
- due_date: Suggested deadline in YYYY-MM-DD format (based on urgency)
- priority: "high", "medium", or "low"
- related_pain_point: Which issue this addresses (if applicable)

Look for:
- Explicit commitments ("I will...", "Let me...")
- Assignments ("John, can you...")
- Follow-ups needed
- Decisions requiring action

Return your response as a JSON array."""

        pain_points_context = ""
        if pain_points:
            pain_points_context = "\n\nIdentified pain points to address:\n" + "\n".join([
                f"- {p.get('text', '')}" for p in pain_points
            ])

        user_prompt = f"""Extract action items from this meeting transcript:

{transcript}
{pain_points_context}

Return a JSON array of action items."""

        response = await self._call_openai_chat(system_prompt, user_prompt)
        
        try:
            actions = json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                actions = json.loads(json_match.group())
            else:
                actions = []

        return actions

    # ═══════════════════════════════════════════════════════════════════════════
    # MEETING SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════

    async def generate_meeting_summary(
        self,
        transcript: str,
        pain_points: list[dict] = None,
        action_items: list[dict] = None,
        sentiment: dict = None
    ) -> dict[str, Any]:
        """
        Generate comprehensive meeting summary.
        
        Returns:
            {
                "title": "Q4 Planning Meeting Summary",
                "executive_summary": "Brief overview...",
                "key_points": ["Point 1", "Point 2"],
                "decisions_made": ["Decision 1"],
                "topics_discussed": ["Topic 1", "Topic 2"],
                "next_steps": ["Step 1", "Step 2"],
                "participants_summary": {...},
                "duration_summary": "45 minutes"
            }
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        system_prompt = """You are an AI meeting summarizer that creates clear, professional summaries.

Generate a comprehensive summary including:
- title: Suggested meeting title based on content
- executive_summary: 2-3 sentence overview
- key_points: Main discussion points (bullet list)
- decisions_made: Any decisions reached
- topics_discussed: List of major topics
- next_steps: Recommended follow-up actions
- participants_summary: Who participated and their roles (if discernible)

Be concise but thorough. Return as JSON."""

        context_parts = [f"Transcript:\n{transcript}"]
        
        if pain_points:
            context_parts.append(f"\nPain points identified: {len(pain_points)}")
        
        if action_items:
            context_parts.append(f"\nAction items generated: {len(action_items)}")
        
        if sentiment:
            context_parts.append(f"\nOverall sentiment: {sentiment.get('overall_label', 'neutral')}")

        user_prompt = f"""Generate a summary for this meeting:

{chr(10).join(context_parts)}

Return a JSON object with the summary."""

        response = await self._call_openai_chat(system_prompt, user_prompt)
        
        try:
            summary = json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                summary = json.loads(json_match.group())
            else:
                summary = {
                    "title": "Meeting Summary",
                    "executive_summary": "Summary generation failed.",
                    "key_points": [],
                }

        return summary

    # ═══════════════════════════════════════════════════════════════════════════
    # REAL-TIME PROCESSING (for live transcription)
    # ═══════════════════════════════════════════════════════════════════════════

    async def process_live_segment(
        self,
        text: str,
        speaker: str = "Unknown"
    ) -> dict[str, Any]:
        """
        Process a live transcript segment for immediate insights.
        
        Returns:
            {
                "text": str,
                "speaker": str,
                "sentiment": {"score": 0.5, "label": "positive"},
                "is_pain_point": bool,
                "pain_point": {...} if is_pain_point else None
            }
        """
        if not self.openai_api_key:
            # Fallback to simple keyword detection
            return self._simple_segment_analysis(text, speaker)

        system_prompt = """Quickly analyze this meeting segment for:
1. Sentiment (score -1 to 1, label)
2. Whether it contains a pain point (PROBLEM/REQUEST/COMPLAINT)

Return JSON with: sentiment, is_pain_point, pain_point (if applicable)"""

        user_prompt = f"""[{speaker}]: {text}

Analyze and return JSON."""

        try:
            response = await self._call_openai_chat(system_prompt, user_prompt, max_tokens=200)
            result = json.loads(response)
        except Exception:
            result = self._simple_segment_analysis(text, speaker)

        result["text"] = text
        result["speaker"] = speaker
        return result

    def _simple_segment_analysis(self, text: str, speaker: str) -> dict:
        """Fallback simple analysis without API."""
        text_lower = text.lower()
        
        # Simple sentiment
        positive_words = {"great", "good", "excellent", "happy", "thank", "appreciate", "wonderful", "perfect"}
        negative_words = {"problem", "issue", "bad", "frustrated", "disappointed", "wrong", "fail", "delayed"}
        
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)
        
        if pos_count > neg_count:
            sentiment = {"score": 0.5, "label": "positive"}
        elif neg_count > pos_count:
            sentiment = {"score": -0.5, "label": "negative"}
        else:
            sentiment = {"score": 0.0, "label": "neutral"}
        
        # Simple pain point detection
        pain_keywords = {"problem", "issue", "need", "request", "complaint", "frustrated", "help", "wrong", "broken"}
        is_pain_point = any(kw in text_lower for kw in pain_keywords)
        
        pain_point = None
        if is_pain_point:
            if any(w in text_lower for w in ["complaint", "frustrated", "disappointed"]):
                label = "COMPLAINT"
            elif any(w in text_lower for w in ["need", "request", "want", "require"]):
                label = "REQUEST"
            else:
                label = "PROBLEM"
            pain_point = {"text": text, "label": label, "speaker": speaker}
        
        return {
            "text": text,
            "speaker": speaker,
            "sentiment": sentiment,
            "is_pain_point": is_pain_point,
            "pain_point": pain_point,
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    async def _call_openai_chat(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o-mini",
        max_tokens: int = 2000
    ) -> str:
        """Make a chat completion request to OpenAI."""
        url = f"{self.openai_base_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        return result["choices"][0]["message"]["content"]


# Singleton instance
ai_service = AIAPIService()
