"""
AI Meet - Video Conferencing Server
WebRTC signaling via Socket.IO + Room management via FastAPI
"""
import logging
import uuid
import random
import string
from datetime import datetime
from pathlib import Path
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import socketio

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-18s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("ai-meet")

# ---------------------------------------------------------------------------
# Socket.IO  (async ASGI mode – works with uvicorn)
# ---------------------------------------------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False,
)

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(title="AI Meet", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve built frontend (production)
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# Combined ASGI application
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# ---------------------------------------------------------------------------
# Room state
# ---------------------------------------------------------------------------
rooms: Dict[str, dict] = {}


def _room_code() -> str:
    c = string.ascii_lowercase
    return f"{''.join(random.choices(c, k=3))}-{''.join(random.choices(c, k=4))}-{''.join(random.choices(c, k=3))}"


def _room(room_id: str) -> dict:
    if room_id not in rooms:
        rooms[room_id] = {
            "id": room_id,
            "participants": {},
            "chat": [],
            "created": datetime.now().isoformat(),
        }
    return rooms[room_id]


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def index():
    # Try to serve built frontend, fall back to dev index.html
    for candidate in [
        dist_path / "index.html",
        Path(__file__).parent.parent / "frontend" / "index.html",
    ]:
        if candidate.exists():
            return FileResponse(str(candidate))
    return {"message": "AI Meet server running"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "rooms": len(rooms)}


@app.post("/api/rooms")
async def create_room():
    rid = _room_code()
    r = _room(rid)
    return {"roomId": rid, "created": r["created"]}


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id in rooms:
        return {
            "roomId": room_id,
            "exists": True,
            "participants": len(rooms[room_id]["participants"]),
        }
    return {"roomId": room_id, "exists": False, "participants": 0}


# ---------------------------------------------------------------------------
# Socket.IO – connection lifecycle
# ---------------------------------------------------------------------------
@sio.event
async def connect(sid, environ):
    logger.info("+ connected  %s", sid)


@sio.event
async def disconnect(sid):
    logger.info("- disconnected %s", sid)
    for rid in list(rooms):
        room = rooms.get(rid)
        if room and sid in room["participants"]:
            p = room["participants"].pop(sid)
            sio.leave_room(sid, rid)
            await sio.emit(
                "participant_left",
                {"sid": sid, "name": p.get("name", "?")},
                room=rid,
            )
            if not room["participants"]:
                del rooms[rid]
                logger.info("  room %s removed (empty)", rid)


# ---------------------------------------------------------------------------
# Socket.IO – room join / leave
# ---------------------------------------------------------------------------
@sio.event
async def join_room(sid, data):
    rid = data.get("roomId", "")
    name = data.get("userName", "Guest")
    audio = data.get("audioEnabled", True)
    video = data.get("videoEnabled", True)
    if not rid:
        return await sio.emit("error", {"message": "Room ID required"}, to=sid)

    room = _room(rid)
    room["participants"][sid] = {
        "name": name,
        "audioEnabled": audio,
        "videoEnabled": video,
        "handRaised": False,
        "screenSharing": False,
        "joined": datetime.now().isoformat(),
    }
    sio.enter_room(sid, rid)

    existing = {k: v for k, v in room["participants"].items() if k != sid}
    await sio.emit(
        "room_joined",
        {"roomId": rid, "participants": existing, "chatHistory": room["chat"][-50:]},
        to=sid,
    )
    await sio.emit(
        "participant_joined",
        {"sid": sid, "name": name, "audioEnabled": audio, "videoEnabled": video},
        room=rid,
        skip_sid=sid,
    )
    logger.info("  %s joined %s  (%d)", name, rid, len(room["participants"]))


@sio.event
async def leave_room(sid, data):
    rid = data.get("roomId", "")
    room = rooms.get(rid)
    if room and sid in room["participants"]:
        p = room["participants"].pop(sid)
        sio.leave_room(sid, rid)
        await sio.emit(
            "participant_left", {"sid": sid, "name": p.get("name", "?")}, room=rid
        )
        if not room["participants"]:
            del rooms[rid]


# ---------------------------------------------------------------------------
# Socket.IO – WebRTC signaling (offer / answer / ice)
# ---------------------------------------------------------------------------
@sio.event
async def offer(sid, data):
    t = data.get("target")
    if t:
        await sio.emit("offer", {"sdp": data.get("sdp"), "sender": sid}, to=t)


@sio.event
async def answer(sid, data):
    t = data.get("target")
    if t:
        await sio.emit("answer", {"sdp": data.get("sdp"), "sender": sid}, to=t)


@sio.event
async def ice_candidate(sid, data):
    t = data.get("target")
    if t:
        await sio.emit(
            "ice_candidate", {"candidate": data.get("candidate"), "sender": sid}, to=t
        )


# ---------------------------------------------------------------------------
# Socket.IO – media state
# ---------------------------------------------------------------------------
@sio.event
async def toggle_audio(sid, data):
    rid = data.get("roomId")
    en = data.get("enabled")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["audioEnabled"] = en
        await sio.emit(
            "participant_audio_changed", {"sid": sid, "enabled": en}, room=rid, skip_sid=sid
        )


@sio.event
async def toggle_video(sid, data):
    rid = data.get("roomId")
    en = data.get("enabled")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["videoEnabled"] = en
        await sio.emit(
            "participant_video_changed", {"sid": sid, "enabled": en}, room=rid, skip_sid=sid
        )


@sio.event
async def screen_share(sid, data):
    rid = data.get("roomId")
    sharing = data.get("sharing")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["screenSharing"] = sharing
        await sio.emit(
            "screen_share_changed", {"sid": sid, "sharing": sharing}, room=rid, skip_sid=sid
        )


# ---------------------------------------------------------------------------
# Socket.IO – chat
# ---------------------------------------------------------------------------
@sio.event
async def chat_message(sid, data):
    rid = data.get("roomId")
    msg = (data.get("message") or "").strip()
    if not rid or not msg or rid not in rooms:
        return
    sender = rooms[rid]["participants"].get(sid, {}).get("name", "Unknown")
    entry = {
        "id": str(uuid.uuid4()),
        "sender": sender,
        "senderSid": sid,
        "message": msg[:2000],
        "timestamp": datetime.now().isoformat(),
    }
    rooms[rid]["chat"].append(entry)
    await sio.emit("chat_message", entry, room=rid)


# ---------------------------------------------------------------------------
# Socket.IO – interactions (hand raise, reactions, captions)
# ---------------------------------------------------------------------------
@sio.event
async def hand_raise(sid, data):
    rid = data.get("roomId")
    raised = data.get("raised", False)
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["handRaised"] = raised
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit(
            "hand_raise_changed", {"sid": sid, "name": name, "raised": raised}, room=rid
        )


@sio.event
async def reaction(sid, data):
    rid = data.get("roomId")
    emoji = data.get("emoji", "")
    if rid in rooms and sid in rooms[rid]["participants"]:
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit("reaction", {"sid": sid, "name": name, "emoji": emoji}, room=rid)


@sio.event
async def caption(sid, data):
    rid = data.get("roomId")
    text = data.get("text", "")
    is_final = data.get("isFinal", False)
    if rid in rooms and sid in rooms[rid]["participants"]:
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit(
            "caption",
            {"sid": sid, "name": name, "text": text, "isFinal": is_final},
            room=rid,
        )
