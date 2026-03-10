#!/bin/bash
cd /home/klassy/Desktop/Meet/video/backend
source /home/klassy/Desktop/Meet/video/backend/venv/bin/activate
exec python -m uvicorn app_meeting:socket_app --host 0.0.0.0 --port 8000 --reload
