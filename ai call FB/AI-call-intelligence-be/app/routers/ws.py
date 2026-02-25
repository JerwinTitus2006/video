"""WebSocket real-time endpoints for live transcription and AI analysis."""

import asyncio
import json
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.live_transcript import LiveTranscriptSegment

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)


# ============================================================
# Connection Manager
# ============================================================

class ConnectionManager:
    """Manages active WebSocket connections per meeting."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.meeting_metadata: dict[str, dict] = {}  # Store meeting state

    async def connect(self, meeting_id: str, websocket: WebSocket, user_name: str = "Guest"):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = []
            self.meeting_metadata[meeting_id] = {
                "participants": [],
                "start_time": datetime.utcnow().isoformat(),
                "transcript_segments": [],
                "pain_points": [],
                "sentiment_scores": [],
            }
        self.active_connections[meeting_id].append(websocket)
        
        # Add participant
        if user_name not in self.meeting_metadata[meeting_id]["participants"]:
            self.meeting_metadata[meeting_id]["participants"].append(user_name)
        
        # Notify others
        await self.broadcast(meeting_id, {
            "type": "participant_joined",
            "user_name": user_name,
            "participant_count": len(self.active_connections[meeting_id]),
            "participants": self.meeting_metadata[meeting_id]["participants"],
        })

    def disconnect(self, meeting_id: str, websocket: WebSocket):
        if meeting_id in self.active_connections:
            if websocket in self.active_connections[meeting_id]:
                self.active_connections[meeting_id].remove(websocket)
            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]
                # Keep metadata for a while for post-processing

    async def broadcast(self, meeting_id: str, message: dict):
        """Broadcast a message to all connections for a meeting."""
        if meeting_id in self.active_connections:
            dead_connections = []
            for ws in self.active_connections[meeting_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.append(ws)
            for ws in dead_connections:
                if ws in self.active_connections[meeting_id]:
                    self.active_connections[meeting_id].remove(ws)

    def get_meeting_state(self, meeting_id: str) -> dict:
        """Get current meeting state."""
        return self.meeting_metadata.get(meeting_id, {})


manager = ConnectionManager()


# ============================================================
# WebSocket Endpoint - Live Meeting
# ============================================================

@router.websocket("/live/{meeting_id}")
async def live_meeting_ws(websocket: WebSocket, meeting_id: str):
    """
    Real-time WebSocket for a live meeting.
    
    Incoming message types:
    - transcript_chunk: Live speech-to-text segment
    - audio_chunk: Raw audio for server-side transcription
    - participant_update: Participant joined/left
    - ping: Keep-alive
    
    Outgoing broadcasts:
    - transcript_update: New transcript segment
    - sentiment_update: Real-time sentiment for segment
    - pain_point_detected: Pain point found
    - solution_suggested: AI-generated solution
    - action_suggestion: Suggested action item
    - participant_joined/left: Participant updates
    """
    user_name = websocket.query_params.get("user", "Guest")
    await manager.connect(meeting_id, websocket, user_name)

    try:
        # Send current meeting state to newly connected client
        state = manager.get_meeting_state(meeting_id)
        await websocket.send_json({
            "type": "meeting_state",
            "participants": state.get("participants", []),
            "start_time": state.get("start_time"),
            "recent_transcripts": state.get("transcript_segments", [])[-10:],  # Last 10 segments
            "pain_points": state.get("pain_points", []),
        })

        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            event_type = payload.get("type", "")

            if event_type == "transcript_chunk":
                await _handle_transcript_chunk(meeting_id, payload, user_name)

            elif event_type == "audio_chunk":
                # Future: Handle raw audio for server-side transcription
                await _handle_audio_chunk(meeting_id, payload)

            elif event_type == "request_analysis":
                # On-demand analysis of full transcript so far
                await _handle_analysis_request(meeting_id, websocket)

            elif event_type == "participant_update":
                await manager.broadcast(meeting_id, {
                    "type": "participant_update",
                    "action": payload.get("action"),
                    "user_name": payload.get("user_name"),
                })

            elif event_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})

    except WebSocketDisconnect:
        manager.disconnect(meeting_id, websocket)
        await manager.broadcast(meeting_id, {
            "type": "participant_left",
            "user_name": user_name,
        })
    except Exception as e:
        logger.error(f"WebSocket error for meeting {meeting_id}: {e}")
        manager.disconnect(meeting_id, websocket)


async def _handle_transcript_chunk(meeting_id: str, payload: dict, user_name: str):
    """Process incoming transcript chunk with real-time AI analysis."""
    text = payload.get("text", "").strip()
    speaker = payload.get("speaker", user_name)
    timestamp = payload.get("timestamp", 0.0)
    
    if not text:
        return
    
    # Store in meeting metadata
    state = manager.get_meeting_state(meeting_id)
    segment_data = {
        "speaker": speaker,
        "text": text,
        "timestamp": timestamp,
        "created_at": datetime.utcnow().isoformat(),
    }
    state.get("transcript_segments", []).append(segment_data)
    
    # Broadcast transcript update
    await manager.broadcast(meeting_id, {
        "type": "transcript_update",
        "speaker": speaker,
        "text": text,
        "timestamp": timestamp,
    })
    
    # Quick sentiment analysis
    sentiment = _analyze_sentiment_quick(text)
    await manager.broadcast(meeting_id, {
        "type": "sentiment_update",
        "speaker": speaker,
        "score": sentiment["score"],
        "label": sentiment["label"],
        "text": text,
    })
    state.get("sentiment_scores", []).append(sentiment["score"])
    
    # Quick pain point detection
    pain_point = _detect_pain_point_quick(text)
    if pain_point:
        pain_data = {
            "label": pain_point["label"],
            "text": text,
            "speaker": speaker,
            "timestamp": timestamp,
        }
        state.get("pain_points", []).append(pain_data)
        
        await manager.broadcast(meeting_id, {
            "type": "pain_point_detected",
            **pain_data,
        })
        
        # Generate quick solution suggestion
        solution = _generate_solution_quick(text, pain_point["label"])
        if solution:
            await manager.broadcast(meeting_id, {
                "type": "solution_suggested",
                "pain_point": text,
                "solution": solution,
            })
        
        # Generate quick action suggestion
        action = _generate_action_quick(text, pain_point["label"])
        if action:
            await manager.broadcast(meeting_id, {
                "type": "action_suggestion",
                "description": action,
                "related_pain_point": text[:100],
            })
    
    # Save to database asynchronously
    asyncio.create_task(_save_transcript_segment(meeting_id, segment_data, sentiment, pain_point))


async def _handle_audio_chunk(meeting_id: str, payload: dict):
    """Handle raw audio chunk for server-side transcription."""
    # This would integrate with Deepgram/Whisper for streaming transcription
    # For now, we expect the client to do speech-to-text
    pass


async def _handle_analysis_request(meeting_id: str, websocket: WebSocket):
    """Handle request for full meeting analysis."""
    state = manager.get_meeting_state(meeting_id)
    
    # Compile full transcript
    transcript_parts = [
        f"[{s['speaker']}]: {s['text']}"
        for s in state.get("transcript_segments", [])
    ]
    full_transcript = "\n".join(transcript_parts)
    
    # Calculate summary stats
    pain_points = state.get("pain_points", [])
    sentiment_scores = state.get("sentiment_scores", [])
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
    
    await websocket.send_json({
        "type": "analysis_summary",
        "transcript_length": len(transcript_parts),
        "pain_point_count": len(pain_points),
        "average_sentiment": round(avg_sentiment, 2),
        "sentiment_label": "positive" if avg_sentiment > 0.2 else "negative" if avg_sentiment < -0.2 else "neutral",
        "pain_point_breakdown": {
            "PROBLEM": len([p for p in pain_points if p["label"] == "PROBLEM"]),
            "REQUEST": len([p for p in pain_points if p["label"] == "REQUEST"]),
            "COMPLAINT": len([p for p in pain_points if p["label"] == "COMPLAINT"]),
        },
    })


async def _save_transcript_segment(meeting_id: str, segment_data: dict, sentiment: dict, pain_point: dict | None):
    """Save transcript segment to database."""
    try:
        async with AsyncSessionLocal() as db:
            segment = LiveTranscriptSegment(
                meeting_id=meeting_id,
                speaker=segment_data["speaker"],
                text=segment_data["text"],
                timestamp_start=segment_data.get("timestamp", 0),
                sentiment_score=sentiment["score"],
                is_pain_point=pain_point is not None,
                pain_point_label=pain_point["label"] if pain_point else None,
            )
            db.add(segment)
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to save transcript segment: {e}")


# ============================================================
# Quick Analysis Functions (lightweight for real-time)
# ============================================================

def _analyze_sentiment_quick(text: str) -> dict:
    """Quick sentiment analysis using keyword matching."""
    text_lower = text.lower()
    
    negative_words = {
        "problem", "issue", "complaint", "broken", "fail", "bad", "wrong",
        "frustrated", "angry", "terrible", "awful", "disappointed", "hate",
        "impossible", "difficult", "struggling", "confused", "delayed",
    }
    positive_words = {
        "great", "good", "excellent", "happy", "resolved", "perfect", "thanks",
        "appreciate", "wonderful", "amazing", "love", "helpful", "success",
        "working", "fixed", "improved", "better", "awesome",
    }
    
    words = set(text_lower.split())
    neg_count = len(words & negative_words)
    pos_count = len(words & positive_words)
    
    if neg_count + pos_count == 0:
        score = 0.0
    else:
        score = round((pos_count - neg_count) / (pos_count + neg_count + 1), 2)
    
    if score > 0.2:
        label = "positive"
    elif score < -0.2:
        label = "negative"
    else:
        label = "neutral"
    
    return {"score": score, "label": label}


def _detect_pain_point_quick(text: str) -> dict | None:
    """Quick pain point detection using keyword matching."""
    text_lower = text.lower()
    
    complaint_patterns = [
        "complaint", "frustrated", "disappointed", "unsatisfied", "terrible",
        "awful", "unacceptable", "hate", "worst",
    ]
    problem_patterns = [
        "problem", "issue", "broken", "doesn't work", "error", "bug", "crash",
        "fail", "wrong", "not working", "delayed", "missing", "stuck",
    ]
    request_patterns = [
        "need", "want", "require", "request", "please", "can you", "would like",
        "hoping", "wish", "should", "must have",
    ]
    
    for pattern in complaint_patterns:
        if pattern in text_lower:
            return {"label": "COMPLAINT", "text": text}
    
    for pattern in problem_patterns:
        if pattern in text_lower:
            return {"label": "PROBLEM", "text": text}
    
    for pattern in request_patterns:
        if pattern in text_lower:
            return {"label": "REQUEST", "text": text}
    
    return None


def _generate_solution_quick(pain_text: str, label: str) -> str | None:
    """Generate quick solution suggestion based on pain point type."""
    solutions = {
        "PROBLEM": [
            "Investigate the root cause and document findings",
            "Schedule a technical review to address this issue",
            "Create a support ticket for immediate attention",
        ],
        "REQUEST": [
            "Add this to the product backlog for prioritization",
            "Schedule a follow-up meeting to discuss requirements",
            "Document the request and assign to relevant team",
        ],
        "COMPLAINT": [
            "Acknowledge the concern and escalate to management",
            "Schedule a call to address the complaint directly",
            "Document feedback for process improvement",
        ],
    }
    
    import random
    options = solutions.get(label, [])
    return random.choice(options) if options else None


def _generate_action_quick(pain_text: str, label: str) -> str:
    """Generate quick action item based on pain point."""
    templates = {
        "PROBLEM": "Investigate and resolve: {text}",
        "REQUEST": "Review and respond to request: {text}",
        "COMPLAINT": "Follow up on feedback: {text}",
    }
    
    template = templates.get(label, "Follow up on: {text}")
    return template.format(text=pain_text[:80] + "..." if len(pain_text) > 80 else pain_text)


# ============================================================
# Helper: broadcast from services
# ============================================================

async def broadcast_to_meeting(meeting_id: str, message: dict):
    """Public helper for services to broadcast messages to a live meeting."""
    await manager.broadcast(meeting_id, message)


def get_meeting_transcript(meeting_id: str) -> list[dict]:
    """Get accumulated transcript segments for a meeting."""
    state = manager.get_meeting_state(meeting_id)
    return state.get("transcript_segments", [])


def get_meeting_pain_points(meeting_id: str) -> list[dict]:
    """Get detected pain points for a meeting."""
    state = manager.get_meeting_state(meeting_id)
    return state.get("pain_points", [])
