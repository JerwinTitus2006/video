"""AI processing endpoints router."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/ai", tags=["AI Processing"])


# ============================================================
# Request / Response Schemas
# ============================================================

class TranscriptSegment(BaseModel):
    speaker: str = ""
    text: str
    start: float = 0.0
    end: float = 0.0


class PainPointExtractRequest(BaseModel):
    meeting_id: UUID
    segments: List[TranscriptSegment]


class PainPointResult(BaseModel):
    text: str
    label: str
    start: float
    end: float
    speaker: str = ""


class ResourceMatchRequest(BaseModel):
    meeting_id: UUID
    pain_point_ids: Optional[List[UUID]] = None


class ResourceMatchResult(BaseModel):
    pain_point_id: UUID
    resource_id: UUID
    score: float
    explanation: str = ""


class ActionGenerateRequest(BaseModel):
    meeting_id: UUID
    pain_point_ids: Optional[List[UUID]] = None


class ActionResult(BaseModel):
    description: str
    owner: str = ""
    due_date: str = ""


class SentimentRequest(BaseModel):
    meeting_id: UUID
    segments: List[TranscriptSegment]


class SentimentResult(BaseModel):
    text: str
    score: float
    speaker: str = ""
    start: float = 0.0
    end: float = 0.0


# ============================================================
# Endpoints
# ============================================================

@router.post("/extract_pain_points", response_model=List[PainPointResult])
async def extract_pain_points(
    data: PainPointExtractRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    RoBERTa NER model:
    - Input: transcript segments
    - Labels: PROBLEM, REQUEST, COMPLAINT
    - Output: pain_point objects with embeddings
    - Stores in pain_points table
    """
    from app.services.painpoint_service import extract_pain_points as extract

    results = await extract(
        meeting_id=str(data.meeting_id),
        segments=[s.model_dump() for s in data.segments],
        db=db,
    )
    return results


@router.post("/match_resources", response_model=List[ResourceMatchResult])
async def match_resources(
    data: ResourceMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    SBERT + pgvector:
    - Query: pain_point.embedding
    - Search: resources.embedding (top 3 matches)
    - Llama3 reranking + explanation generation
    - Stores in matches table
    """
    from app.services.resource_service import match_resources_for_meeting

    results = await match_resources_for_meeting(
        meeting_id=str(data.meeting_id),
        pain_point_ids=[str(pid) for pid in data.pain_point_ids] if data.pain_point_ids else None,
        db=db,
    )
    return results


@router.post("/generate_actions", response_model=List[ActionResult])
async def generate_actions(
    data: ActionGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Llama3-8B prompt:
    Input: pain_point + matched_resource + context
    Output: structured task (owner, due_date, description)
    Validates + stores in action_items
    """
    from app.services.action_service import generate_actions_for_meeting

    results = await generate_actions_for_meeting(
        meeting_id=str(data.meeting_id),
        pain_point_ids=[str(pid) for pid in data.pain_point_ids] if data.pain_point_ids else None,
        db=db,
    )
    return results


@router.post("/analyze_sentiment", response_model=List[SentimentResult])
async def analyze_sentiment(
    data: SentimentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Multilingual BERT:
    - Per-speaker segments
    - Score: -1 (negative) to +1 (positive)
    - Stores in sentiment_segments table
    - Calculates meeting avg + trends
    """
    from app.services.sentiment_service import analyze_meeting_sentiment

    results = await analyze_meeting_sentiment(
        meeting_id=str(data.meeting_id),
        segments=[s.model_dump() for s in data.segments],
        db=db,
    )
    return results
