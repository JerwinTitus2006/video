"""Pain point extraction service (RoBERTa NER)."""

import logging
import uuid
from typing import Any

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pain_point import PainPoint

logger = logging.getLogger(__name__)


# =====================================================
# STUB: Model loading — replace with actual RoBERTa NER
# =====================================================
#
# Production implementation:
#
# from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
#
# tokenizer = AutoTokenizer.from_pretrained("roberta-base")
# model = AutoModelForTokenClassification.from_pretrained("your-finetuned-roberta-ner")
# ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")
#
# For embeddings:
# from sentence_transformers import SentenceTransformer
# embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
# =====================================================


def _classify_text(text: str) -> dict[str, Any] | None:
    """
    Classify a text segment as PROBLEM, REQUEST, or COMPLAINT.
    Stub: keyword-based classification. Replace with RoBERTa NER.
    """
    text_lower = text.lower()

    complaint_keywords = {"complaint", "frustrated", "disappointed", "unsatisfied", "terrible", "awful", "unacceptable"}
    problem_keywords = {"problem", "issue", "broken", "error", "bug", "crash", "fail", "delayed", "missing", "wrong"}
    request_keywords = {"need", "want", "require", "request", "please", "can you", "would like", "hoping"}

    for kw in complaint_keywords:
        if kw in text_lower:
            return {"label": "COMPLAINT", "confidence": 0.85}

    for kw in problem_keywords:
        if kw in text_lower:
            return {"label": "PROBLEM", "confidence": 0.90}

    for kw in request_keywords:
        if kw in text_lower:
            return {"label": "REQUEST", "confidence": 0.80}

    return None


def _generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dim embedding for the text.
    Stub: returns a random normalized vector. Replace with SBERT.
    """
    # Production: return embedding_model.encode(text).tolist()
    rng = np.random.RandomState(hash(text) % 2**31)
    vec = rng.randn(768).astype(float)
    vec = vec / np.linalg.norm(vec)
    return vec.tolist()


async def extract_pain_points(
    meeting_id: str,
    segments: list[dict],
    db: AsyncSession,
) -> list[dict]:
    """
    Extract pain points from transcript segments using NER.

    Pipeline:
    1. Run NER on each segment
    2. Classify as PROBLEM / REQUEST / COMPLAINT
    3. Generate embedding for each pain point
    4. Store in pain_points table

    Returns:
        List of extracted pain point dicts
    """
    results = []
    meeting_uuid = uuid.UUID(meeting_id)

    for segment in segments:
        text = segment.get("text", "")
        classification = _classify_text(text)

        if classification:
            embedding = _generate_embedding(text)

            pain_point = PainPoint(
                meeting_id=meeting_uuid,
                text=text,
                label=classification["label"],
                embedding=embedding,
                timestamp_start=segment.get("start"),
                timestamp_end=segment.get("end"),
                status="open",
            )
            db.add(pain_point)
            await db.flush()
            await db.refresh(pain_point)

            results.append({
                "id": str(pain_point.id),
                "text": text,
                "label": classification["label"],
                "start": segment.get("start", 0.0),
                "end": segment.get("end", 0.0),
                "speaker": segment.get("speaker", ""),
                "confidence": classification["confidence"],
            })

    await db.commit()
    logger.info(f"Extracted {len(results)} pain points for meeting {meeting_id}")
    return results
