"""Action item generation service (Llama3-8B)."""

import logging
import uuid
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_item import ActionItem
from app.models.pain_point import PainPoint
from app.models.resource import ResourceMatch

logger = logging.getLogger(__name__)


# =====================================================
# STUB: Model loading — replace with Llama3-8B
# =====================================================
#
# from transformers import AutoTokenizer, AutoModelForCausalLM
# import torch
#
# tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")
# model = AutoModelForCausalLM.from_pretrained(
#     "meta-llama/Meta-Llama-3-8B-Instruct",
#     torch_dtype=torch.float16,
#     device_map="auto",
# )
# =====================================================


def _generate_action(pain_point_text: str, resource_info: str, context: str = "") -> dict:
    """
    Generate a structured action item using Llama3.
    Stub: template-based generation. Replace with Llama3 inference.
    """
    # Production prompt:
    # prompt = f"""Based on this pain point and matching resource, generate a structured action item.
    #
    # Pain Point: {pain_point_text}
    # Matching Resource: {resource_info}
    # Context: {context}
    #
    # Respond in JSON format: {{"owner": "...", "due_date": "YYYY-MM-DD", "description": "..."}}"""
    #
    # inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    # outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.7)
    # response = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Stub: generate reasonable action item
    due = (date.today() + timedelta(days=7)).isoformat()

    return {
        "owner": "Team Lead",
        "due_date": due,
        "description": f"Address: {pain_point_text[:200]}. "
                       f"Refer to resource: {resource_info[:100]}. "
                       f"Take corrective action and follow up within one week.",
    }


def _validate_action(action: dict) -> dict:
    """Validate and normalize action item fields."""
    if not action.get("description"):
        action["description"] = "Follow up on identified issue"

    if action.get("due_date"):
        try:
            date.fromisoformat(action["due_date"])
        except (ValueError, TypeError):
            action["due_date"] = (date.today() + timedelta(days=7)).isoformat()
    else:
        action["due_date"] = (date.today() + timedelta(days=7)).isoformat()

    if not action.get("owner"):
        action["owner"] = "Unassigned"

    return action


async def generate_actions_for_meeting(
    meeting_id: str,
    pain_point_ids: list[str] | None = None,
    db: AsyncSession = None,
) -> list[dict]:
    """
    Generate action items for pain points in a meeting.

    Pipeline:
    1. Get pain points (all or specific IDs)
    2. Get matched resources for each
    3. Call Llama3 to generate structured action
    4. Validate output
    5. Store in action_items table

    Returns:
        List of generated action dicts
    """
    meeting_uuid = uuid.UUID(meeting_id)

    # Get pain points
    query = select(PainPoint).where(PainPoint.meeting_id == meeting_uuid)
    if pain_point_ids:
        pp_uuids = [uuid.UUID(pid) for pid in pain_point_ids]
        query = query.where(PainPoint.id.in_(pp_uuids))

    result = await db.execute(query)
    pain_points = result.scalars().all()

    generated_actions = []

    for pp in pain_points:
        # Get matched resources
        matches_result = await db.execute(
            select(ResourceMatch).where(ResourceMatch.pain_point_id == pp.id)
        )
        matches = matches_result.scalars().all()

        resource_info = ""
        if matches:
            top_match = max(matches, key=lambda m: m.score)
            resource_info = top_match.explanation or "Related resource available"

        # Generate action via Llama3
        raw_action = _generate_action(
            pain_point_text=pp.text,
            resource_info=resource_info,
        )

        # Validate
        validated = _validate_action(raw_action)

        # Store
        action_item = ActionItem(
            meeting_id=meeting_uuid,
            pain_point_id=pp.id,
            owner=validated["owner"],
            description=validated["description"],
            due_date=date.fromisoformat(validated["due_date"]),
            status="pending",
        )
        db.add(action_item)
        await db.flush()
        await db.refresh(action_item)

        generated_actions.append({
            "id": str(action_item.id),
            "description": validated["description"],
            "owner": validated["owner"],
            "due_date": validated["due_date"],
        })

    await db.commit()
    logger.info(f"Generated {len(generated_actions)} action items for meeting {meeting_id}")
    return generated_actions
