"""WebSocket real-time endpoints."""

import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])


# ============================================================
# Connection Manager
# ============================================================

class ConnectionManager:
    """Manages active WebSocket connections per meeting."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, meeting_id: str, websocket: WebSocket):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = []
        self.active_connections[meeting_id].append(websocket)

    def disconnect(self, meeting_id: str, websocket: WebSocket):
        if meeting_id in self.active_connections:
            self.active_connections[meeting_id].remove(websocket)
            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]

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
                self.active_connections[meeting_id].remove(ws)


manager = ConnectionManager()


# ============================================================
# WebSocket Endpoint
# ============================================================

@router.websocket("/live/{meeting_id}")
async def live_meeting_ws(websocket: WebSocket, meeting_id: str):
    """
    Real-time WebSocket for a live meeting.
    Broadcasts:
    - Live sentiment updates
    - Real-time pain point detection
    - Live action suggestions
    """
    await manager.connect(meeting_id, websocket)

    try:
        while True:
            # Receive incoming data from client (e.g., live transcript chunks)
            data = await websocket.receive_text()
            payload = json.loads(data)

            event_type = payload.get("type", "")

            if event_type == "transcript_chunk":
                # Process live transcript chunk
                text = payload.get("text", "")
                speaker = payload.get("speaker", "unknown")

                # === Live Sentiment ===
                sentiment_score = _quick_sentiment(text)
                await manager.broadcast(meeting_id, {
                    "type": "sentiment_update",
                    "speaker": speaker,
                    "score": sentiment_score,
                    "text": text,
                })

                # === Live Pain Point Detection ===
                pain_point = _quick_pain_point_check(text)
                if pain_point:
                    await manager.broadcast(meeting_id, {
                        "type": "pain_point_detected",
                        "label": pain_point["label"],
                        "text": pain_point["text"],
                        "speaker": speaker,
                    })

                    # === Live Action Suggestion ===
                    suggestion = _generate_quick_action(pain_point["text"])
                    if suggestion:
                        await manager.broadcast(meeting_id, {
                            "type": "action_suggestion",
                            "description": suggestion,
                            "related_pain_point": pain_point["text"],
                        })

            elif event_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(meeting_id, websocket)
    except Exception:
        manager.disconnect(meeting_id, websocket)


# ============================================================
# Quick Analysis Stubs (for real-time — lightweight versions)
# ============================================================

def _quick_sentiment(text: str) -> float:
    """
    Quick sentiment scoring for live use.
    Stub: returns neutral score. Replace with a lightweight model.
    """
    # Simple keyword-based heuristic for demonstration
    negative_words = {"problem", "issue", "complaint", "broken", "fail", "bad", "wrong", "frustrated", "angry", "terrible"}
    positive_words = {"great", "good", "excellent", "happy", "resolved", "perfect", "thanks", "appreciate", "wonderful"}

    words = set(text.lower().split())
    neg_count = len(words & negative_words)
    pos_count = len(words & positive_words)

    if neg_count + pos_count == 0:
        return 0.0
    return round((pos_count - neg_count) / (pos_count + neg_count), 2)


def _quick_pain_point_check(text: str) -> dict | None:
    """
    Quick pain point detection for live use.
    Stub: keyword-based check. Replace with a lightweight NER model.
    """
    problem_keywords = {"problem", "issue", "broken", "doesn't work", "error", "bug", "crash"}
    request_keywords = {"need", "want", "require", "request", "please", "can you"}
    complaint_keywords = {"complaint", "frustrated", "disappointed", "unsatisfied", "terrible"}

    text_lower = text.lower()

    for kw in complaint_keywords:
        if kw in text_lower:
            return {"label": "COMPLAINT", "text": text}

    for kw in problem_keywords:
        if kw in text_lower:
            return {"label": "PROBLEM", "text": text}

    for kw in request_keywords:
        if kw in text_lower:
            return {"label": "REQUEST", "text": text}

    return None


def _generate_quick_action(pain_text: str) -> str | None:
    """
    Quick action suggestion for live use.
    Stub: template-based. Replace with Llama3 inference.
    """
    return f"Follow up on: {pain_text[:100]}..."


# ============================================================
# Helper: broadcast from services
# ============================================================

async def broadcast_to_meeting(meeting_id: str, message: dict):
    """Public helper for services to broadcast messages to a live meeting."""
    await manager.broadcast(meeting_id, message)
