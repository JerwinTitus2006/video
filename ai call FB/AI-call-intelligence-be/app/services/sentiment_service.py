"""Sentiment analysis service (Multilingual BERT)."""

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sentiment import SentimentSegment

logger = logging.getLogger(__name__)


# =====================================================
# STUB: Model loading — replace with Multilingual BERT
# =====================================================
#
# from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
#
# tokenizer = AutoTokenizer.from_pretrained("nlptown/bert-base-multilingual-uncased-sentiment")
# model = AutoModelForSequenceClassification.from_pretrained(
#     "nlptown/bert-base-multilingual-uncased-sentiment"
# )
# sentiment_pipeline = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)
# =====================================================


def _analyze_sentiment(text: str) -> float:
    """
    Score sentiment of a text segment.
    Stub: keyword-based scoring. Replace with Multilingual BERT.

    Returns:
        float score from -1.0 (very negative) to +1.0 (very positive)
    """
    # Production:
    # result = sentiment_pipeline(text[:512])[0]
    # # Convert 1-5 star rating to -1 to +1
    # stars = int(result["label"].split()[0])
    # return (stars - 3) / 2.0

    text_lower = text.lower()

    negative_words = {
        "problem": -0.4, "issue": -0.3, "broken": -0.5, "fail": -0.5,
        "frustrated": -0.7, "angry": -0.8, "terrible": -0.9, "disappointed": -0.6,
        "delayed": -0.4, "wrong": -0.3, "complaint": -0.5, "unsatisfied": -0.6,
    }
    positive_words = {
        "great": 0.5, "good": 0.3, "excellent": 0.8, "happy": 0.6,
        "resolved": 0.4, "perfect": 0.9, "thanks": 0.3, "appreciate": 0.5,
        "wonderful": 0.7, "satisfied": 0.5, "improved": 0.4,
    }

    total_score = 0.0
    word_count = 0

    for word, score in negative_words.items():
        if word in text_lower:
            total_score += score
            word_count += 1

    for word, score in positive_words.items():
        if word in text_lower:
            total_score += score
            word_count += 1

    if word_count == 0:
        return 0.0

    return max(-1.0, min(1.0, round(total_score / word_count, 2)))


async def analyze_meeting_sentiment(
    meeting_id: str,
    segments: list[dict],
    db: AsyncSession,
) -> list[dict]:
    """
    Analyze sentiment for all segments in a meeting.

    Pipeline:
    1. Score each segment with Multilingual BERT
    2. Store sentiment_segments in DB
    3. Calculate meeting average

    Returns:
        List of sentiment result dicts
    """
    meeting_uuid = uuid.UUID(meeting_id)
    results = []
    total_score = 0.0

    for segment in segments:
        text = segment.get("text", "")
        score = _analyze_sentiment(text)

        sentiment_seg = SentimentSegment(
            meeting_id=meeting_uuid,
            text=text,
            score=score,
            timestamp_start=segment.get("start"),
            timestamp_end=segment.get("end"),
        )
        db.add(sentiment_seg)

        total_score += score
        results.append({
            "text": text,
            "score": score,
            "speaker": segment.get("speaker", ""),
            "start": segment.get("start", 0.0),
            "end": segment.get("end", 0.0),
        })

    await db.commit()

    avg_score = round(total_score / len(segments), 2) if segments else 0.0
    logger.info(
        f"Sentiment analysis complete for meeting {meeting_id}: "
        f"{len(results)} segments, avg score: {avg_score}"
    )

    return results
