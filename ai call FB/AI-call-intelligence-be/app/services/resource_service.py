"""Resource matching service (SBERT + pgvector + Llama3 reranking)."""

import logging
import uuid
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pain_point import PainPoint
from app.models.resource import Resource, ResourceMatch

logger = logging.getLogger(__name__)


# =====================================================
# STUB: Model loading — replace with actual models
# =====================================================
#
# from sentence_transformers import SentenceTransformer
# sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
#
# For Llama3 reranking:
# from transformers import AutoTokenizer, AutoModelForCausalLM
# llama_tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")
# llama_model = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")
# =====================================================


async def _find_similar_resources(
    embedding: list[float],
    top_k: int,
    db: AsyncSession,
) -> list[dict]:
    """
    Find top-K resources by pgvector cosine distance.
    """
    query = text("""
        SELECT id, title, description, category,
               1 - (embedding <=> :embedding::vector) AS score
        FROM resources
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :embedding::vector
        LIMIT :limit
    """)

    result = await db.execute(query, {
        "embedding": str(embedding),
        "limit": top_k,
    })

    return [
        {
            "resource_id": str(row.id),
            "title": row.title,
            "description": row.description,
            "category": row.category,
            "score": float(row.score),
        }
        for row in result
    ]


def _rerank_and_explain(pain_point_text: str, candidates: list[dict]) -> list[dict]:
    """
    Llama3 reranking + explanation generation.
    Stub: pass through with generated explanations. Replace with Llama3 inference.
    """
    # Production:
    # prompt = f"""Given this pain point: "{pain_point_text}"
    # Rank the following resources by relevance and explain why each is relevant:
    # {json.dumps(candidates, indent=2)}"""
    # response = llama_model.generate(...)

    reranked = []
    for i, candidate in enumerate(candidates):
        candidate["explanation"] = (
            f"This resource about '{candidate['title']}' is relevant because it "
            f"addresses topics related to the identified concern."
        )
        # Stub: slightly adjust scores for "reranking" effect
        candidate["score"] = max(0, candidate["score"] - (i * 0.01))
        reranked.append(candidate)

    return sorted(reranked, key=lambda x: x["score"], reverse=True)


async def match_resources_for_meeting(
    meeting_id: str,
    pain_point_ids: list[str] | None = None,
    db: AsyncSession = None,
) -> list[dict]:
    """
    Match resources to pain points using SBERT + pgvector + Llama3 reranking.

    Pipeline:
    1. Get pain points (all or specific IDs)
    2. For each: query pgvector for top-3 similar resources
    3. Rerank with Llama3
    4. Generate explanations
    5. Store matches

    Returns:
        List of match result dicts
    """
    meeting_uuid = uuid.UUID(meeting_id)

    # Get pain points
    query = select(PainPoint).where(PainPoint.meeting_id == meeting_uuid)
    if pain_point_ids:
        pp_uuids = [uuid.UUID(pid) for pid in pain_point_ids]
        query = query.where(PainPoint.id.in_(pp_uuids))

    result = await db.execute(query)
    pain_points = result.scalars().all()

    all_matches = []

    for pp in pain_points:
        if pp.embedding is None:
            continue

        # Find similar resources via pgvector
        candidates = await _find_similar_resources(
            embedding=list(pp.embedding),
            top_k=3,
            db=db,
        )

        if not candidates:
            continue

        # Rerank & explain with Llama3
        reranked = _rerank_and_explain(pp.text, candidates)

        # Store matches
        for match_data in reranked:
            match_record = ResourceMatch(
                pain_point_id=pp.id,
                resource_id=uuid.UUID(match_data["resource_id"]),
                score=match_data["score"],
                explanation=match_data["explanation"],
            )
            db.add(match_record)

            all_matches.append({
                "pain_point_id": str(pp.id),
                "resource_id": match_data["resource_id"],
                "score": match_data["score"],
                "explanation": match_data["explanation"],
            })

    await db.commit()
    logger.info(f"Generated {len(all_matches)} resource matches for meeting {meeting_id}")
    return all_matches
