"""Speaker identification service via voice embeddings."""

import logging
import uuid
from typing import Any

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.person import Person
from app.models.meeting import Meeting, meeting_persons

logger = logging.getLogger(__name__)
settings = get_settings()


async def identify_speaker(
    voice_embedding: list[float],
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Compare a voice embedding against all known persons.

    Logic:
    - Cosine similarity against persons.voice_embedding
    - Threshold > 0.85 = known person
    - New voice = create new distributor profile

    Args:
        voice_embedding: 512-dim voice embedding vector
        db: Database session

    Returns:
        dict with person_id, name, is_new, similarity_score
    """
    embedding_array = np.array(voice_embedding)

    # Fetch all persons with voice embeddings
    result = await db.execute(
        select(Person).where(Person.voice_embedding.isnot(None))
    )
    persons = result.scalars().all()

    best_match = None
    best_score = 0.0

    for person in persons:
        if person.voice_embedding is not None:
            person_embedding = np.array(person.voice_embedding)
            # Cosine similarity
            norm_a = np.linalg.norm(embedding_array)
            norm_b = np.linalg.norm(person_embedding)
            if norm_a > 0 and norm_b > 0:
                similarity = float(np.dot(embedding_array, person_embedding) / (norm_a * norm_b))
            else:
                similarity = 0.0

            if similarity > best_score:
                best_score = similarity
                best_match = person

    threshold = settings.SPEAKER_SIMILARITY_THRESHOLD

    if best_match and best_score >= threshold:
        logger.info(f"Identified speaker: {best_match.name} (score: {best_score:.3f})")
        return {
            "person_id": str(best_match.id),
            "name": best_match.name,
            "is_new": False,
            "similarity_score": best_score,
        }
    else:
        # Create new person profile
        new_person = Person(
            name=f"Speaker_{str(uuid.uuid4())[:8]}",
            role="distributor",
            voice_embedding=voice_embedding,
        )
        db.add(new_person)
        await db.flush()
        await db.refresh(new_person)

        logger.info(f"New speaker detected, created profile: {new_person.name}")
        return {
            "person_id": str(new_person.id),
            "name": new_person.name,
            "is_new": True,
            "similarity_score": best_score,
        }


async def identify_speakers_in_meeting(
    meeting_id: str,
    segments: list[dict],
    db: AsyncSession,
) -> dict[str, str]:
    """
    Identify all speakers in a meeting's transcript segments.

    Returns:
        Mapping of speaker_label -> person_id
    """
    # Collect unique speakers
    speaker_labels = set(seg.get("speaker", "unknown") for seg in segments)
    speaker_map: dict[str, str] = {}

    for label in speaker_labels:
        # In production, extract voice embedding from audio segments
        # For stub: use a zero vector
        stub_embedding = [0.0] * 512

        result = await identify_speaker(
            voice_embedding=stub_embedding,
            db=db,
        )
        speaker_map[label] = result["person_id"]

        # Link person to meeting
        meeting_uuid = uuid.UUID(meeting_id)
        person_uuid = uuid.UUID(result["person_id"])
        await db.execute(
            meeting_persons.insert().values(
                meeting_id=meeting_uuid,
                person_id=person_uuid,
            )
        )

    await db.commit()
    logger.info(f"Identified {len(speaker_map)} speakers for meeting {meeting_id}")
    return speaker_map
