# Jitsi Meet Integration for AI Call Intelligence Platform

This document explains the full Jitsi Meet integration that has been added to the AI Call Intelligence platform.

## Overview

The platform now includes a complete Jitsi Meet video conferencing stack integrated with real-time AI analysis capabilities:

- **Video Conferencing**: Full Jitsi Meet deployment (web, prosody, jicofo, jvb)
- **Real-time AI Analysis**: Live sentiment analysis, pain point detection, and action suggestions during meetings
- **Automatic Transcription**: Post-meeting processing with WhisperX + speaker diarization
- **Webhook Integration**: Prosody automatically notifies the backend about conference lifecycle events

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React + Vite)                        │
│  - JitsiMeeting Component (External API iframe)                         │
│  - LiveMeetingPage (split view: video + AI analysis panel)              │
│  - MeetingsPage (Start Meeting / Schedule Meeting buttons)              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ WebSocket (live analysis)
                           │ REST API (meeting CRUD, Jitsi room mgmt)
┌──────────────────────────▼──────────────────────────────────────────────┐
│                        Backend (FastAPI)                                 │
│  - /api/v1/meetings/{id}/start      → Generate Jitsi room URL           │
│  - /api/v1/meetings/{id}/join       → Join existing room                │
│  - /api/v1/meetings/quick-start     → Instant meeting creation + start  │
│  - /api/v1/webhooks/jitsi/event/*   → Prosody webhook endpoints         │
│  - /live/{meeting_id}                → WebSocket for live AI updates    │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
     ┌────────────▼─────┐  ┌────────▼──────────┐
     │  Jitsi Meet Stack │  │  AI Services      │
     │  - web (nginx+SPA)│  │  - WhisperX       │
     │  - prosody (XMPP) │  │  - Sentiment      │
     │  - jicofo         │  │  - Pain Points    │
     │  - jvb (media)    │  │  - Action Items   │
     └───────────────────┘  └───────────────────┘
```

## Backend Changes

### 1. Configuration (`app/config.py`)

Added Jitsi-specific settings:

```python
# Jitsi Meet Integration
JITSI_DOMAIN: str = "localhost:8000"        # Public domain of Jitsi server
JITSI_APP_ID: str = ""                      # Optional JWT auth
JITSI_APP_SECRET: str = ""
JITSI_WEBHOOK_SECRET: str = ""              # Shared secret for Prosody webhooks
```

### 2. Webhook Router (`app/routers/webhooks.py`)

**New Endpoints:**

- `POST /api/v1/webhooks/jitsi/event/conference-started`  
  Fired when a room is created (first participant joins). Creates a Meeting record.

- `POST /api/v1/webhooks/jitsi/event/conference-ended`  
  Fired when the last participant leaves. Stamps `ended_at` and triggers AI processing.

- `POST /api/v1/webhooks/jitsi/event/participant-joined`  
  Logs participant join events.

- `POST /api/v1/webhooks/jitsi/event/participant-left`  
  Logs participant departure events.

- `POST /api/v1/webhooks/jitsi/transcript`  
  (Optional) Transcriber bot can deliver audio file path here for processing.

**Webhook Security:**  
All webhook endpoints verify the `X-Webhook-Secret` header against `JITSI_WEBHOOK_SECRET` to prevent unauthorized calls.

### 3. Meetings Router (`app/routers/meetings.py`)

**New Endpoints:**

- `POST /api/v1/meetings/{id}/start`  
  Assigns a Jitsi room ID to the meeting, sets status to `in_progress`, returns room URL.

- `POST /api/v1/meetings/{id}/join`  
  Returns the Jitsi room URL for participants to join (creates room ID if needed).

- `GET /api/v1/meetings/{id}/jitsi`  
  Read-only endpoint to get current Jitsi room info.

- `POST /api/v1/meetings/quick-start`  
  One-shot: creates a meeting record + returns Jitsi room URL immediately (no two-step flow).

**Example Response:**

```json
{
  "meeting_id": "550e8400-e29b-41d4-a716-446655440000",
  "jitsi_room_id": "quick-meeting-a3f2b1",
  "room_url": "http://localhost:8000/quick-meeting-a3f2b1",
  "status": "in_progress"
}
```

### 4. Docker Compose Integration

Merged Jitsi services into `docker-compose.yml`:

```yaml
services:
  jitsi_web:       # Nginx + Jitsi Meet SPA (port 8000)
  jitsi_prosody:   # XMPP server (internal)
  jitsi_jicofo:    # Conference focus (internal)
  jitsi_jvb:       # Video bridge (ports 10000/UDP, 4443/TCP)
```

**Key Environment Variables:**

```env
JITSI_HTTP_PORT=8000
JITSI_PUBLIC_URL=http://localhost:8000
JVB_ADVERTISE_IPS=127.0.0.1          # Set to your public IP for remote participants
JICOFO_AUTH_PASSWORD=<random-secret>
JVB_AUTH_PASSWORD=<random-secret>
JIBRI_RECORDER_PASSWORD=<random-secret>
```

**Prosody Webhook Configuration:**

```env
CONFERENCE_WEBHOOK_URL=http://backend:8000/api/v1/webhooks/jitsi/event
```

## Frontend Changes

### 1. JitsiMeeting Component (`src/components/JitsiMeeting.tsx`)

Embeds Jitsi Meet using the External API:

```tsx
<JitsiMeeting
  roomName="my-room-123"
  domain="localhost:8000"
  displayName="John Doe"
  onMeetingEnd={() => navigate('/meetings')}
  onParticipantJoined={(p) => console.log('Joined:', p)}
  onParticipantLeft={(p) => console.log('Left:', p)}
/>
```

**Features:**
- Dynamically loads `external_api.js` from the Jitsi domain
- Customizable toolbar buttons
- Event listeners for join/leave/error events
- Loading and error states

### 2. LiveMeetingPage (`src/pages/meetings/LiveMeetingPage.tsx`)

Full-screen split view:

**Left Panel:** Jitsi video conference  
**Right Panel:** Live AI analysis

- **Real-time Sentiment:** Shows sentiment (positive/neutral/negative) for each speaker's utterances
- **Pain Points Detected:** Highlights customer pain points as they're mentioned
- **AI Suggestions:** Action items generated on-the-fly

**WebSocket Connection:**

```javascript
const ws = new WebSocket(`ws://localhost:8000/live/${meetingId}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'sentiment_update') {
    // Update sentiment chart
  } else if (data.type === 'pain_point_detected') {
    // Add to pain points list
  } else if (data.type === 'action_suggestion') {
    // Display suggestion
  }
};
```

### 3. MeetingsPage Updates (`src/pages/meetings/MeetingsPage.tsx`)

**New Buttons:**

- **"Start Meeting Now"** → Calls `/meetings/quick-start` and redirects to `/meetings/{id}/live`
- **"Schedule Meeting"** → Opens the existing scheduling modal

### 4. MeetingDetailPage (`src/pages/meetings/MeetingDetailPage.tsx`)

Replaced placeholder with real detail view:

- Shows meeting metadata (title, status, started_at, transcript availability)
- **"Join Live Meeting"** button (if status = `in_progress`)
- **"Start Meeting"** button (if status = `pending`)
- Displays transcript if available

### 5. MeetingService (`src/services/meetingService.ts`)

**New Methods:**

```typescript
MeetingService.startJitsiMeeting(id: string)  
// → POST /meetings/{id}/start

MeetingService.joinJitsiMeeting(id: string)  
// → POST /meetings/{id}/join

MeetingService.getJitsiInfo(id: string)  
// → GET /meetings/{id}/jitsi

MeetingService.quickStartMeeting(title?: string)  
// → POST /meetings/quick-start
```

### 6. Type Definitions (`src/types/api.ts`)

```typescript
export interface JitsiRoomInfo {
  meeting_id: string;
  jitsi_room_id: string;
  room_url: string;
  status: string;
}

export interface JitsiParticipant {
  id: string;
  displayName: string;
  email?: string;
  joinedAt: string;
}
```

### 7. App Routes (`src/App.tsx`)

Added route:

```tsx
<Route path="meetings/:id/live" element={<LiveMeetingPage />} />
```

## Setup Instructions

### 1. Backend Setup

```bash
cd "video/ai call FB/AI-call-intelligence-be"

# Copy example env
cp .env.example .env

# Edit .env and set Jitsi variables:
#   JITSI_DOMAIN=localhost:8000
#   JVB_ADVERTISE_IPS=<your-public-ip>
#   (Generate random secrets for JICOFO_AUTH_PASSWORD, JVB_AUTH_PASSWORD, etc.)

# Install dependencies
pip install -r requirements.txt

# Start all services (including Jitsi stack)
docker-compose up -d

# Run migrations (if needed)
alembic upgrade head
```

### 2. Frontend Setup

```bash
cd "video/ai call FB/AI-call-intelligence-fe"

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env
echo "VITE_JITSI_DOMAIN=localhost:8000" >> .env

# Start dev server
npm run dev
```

### 3. Test the Integration

1. Open the frontend: `http://localhost:5173`
2. Navigate to **Meetings**
3. Click **"Start Meeting Now"**
4. You should see:
   - Jitsi video conference on the left
   - Live AI analysis panel on the right
   - Ability to invite others by sharing the URL

### 4. Production Deployment

**Important:** For production, you must:

1. **Set a real domain** in `.env`:
   ```env
   JITSI_DOMAIN=meet.yourdomain.com
   JITSI_PUBLIC_URL=https://meet.yourdomain.com
   ENABLE_LETSENCRYPT=1
   LETSENCRYPT_EMAIL=admin@yourdomain.com
   ```

2. **Configure JVB advertised IPs** (must include your public IP):
   ```env
   JVB_ADVERTISE_IPS=10.0.0.5,203.0.113.42
   ```

3. **Generate strong secrets**:
   ```bash
   openssl rand -hex 32  # Repeat for each password
   ```

4. **Enable webhook authentication**:
   ```env
   JITSI_WEBHOOK_SECRET=<random-secret>
   ```
   And update Prosody config to send this secret in requests.

5. **SSL/TLS**: Let's Encrypt will auto-provision certificates if `ENABLE_LETSENCRYPT=1`.

## Event Flow Example

### Scenario: User clicks "Start Meeting Now"

1. **Frontend:** User clicks button
   ```javascript
   const response = await MeetingService.quickStartMeeting('Quick Meeting');
   navigate(`/meetings/${response.data.meeting_id}/live`);
   ```

2. **Backend:** Creates meeting + generates room ID
   ```python
   # POST /api/v1/meetings/quick-start
   room_id = "quick-meeting-a3f2b1"
   meeting = Meeting(title="Quick Meeting", jitsi_room_id=room_id, status="in_progress")
   db.add(meeting)
   return {"meeting_id": meeting.id, "room_url": f"http://localhost:8000/{room_id}"}
   ```

3. **Frontend:** Loads LiveMeetingPage
   - Renders `<JitsiMeeting roomName="quick-meeting-a3f2b1" />`
   - Opens WebSocket to `/live/{meeting_id}`

4. **Jitsi:** User joins the room
   - Prosody fires `conference-started` webhook → Backend logs start time
   - Prosody fires `participant-joined` webhook → Backend logs participant

5. **During Meeting:** As users speak
   - (Optional) Transcriber bot records audio and sends chunks via WebSocket
   - Backend runs live sentiment analysis and broadcasts updates
   - Pain points detected in real-time → shown in analysis panel

6. **End Meeting:** Last participant leaves
   - Prosody fires `conference-ended` webhook
   - Backend stamps `ended_at` and queues full AI processing (WhisperX, diarization, etc.)

7. **Post-Processing:** Background task runs
   - Transcription → Speaker identification → Pain points → Sentiment → Resources → Action items
   - Meeting status changes to `completed`

## WebSocket Live Analysis Protocol

Messages sent from backend to frontend:

### Sentiment Update
```json
{
  "type": "sentiment_update",
  "speaker": "John Doe",
  "score": 0.75,
  "text": "This feature is amazing!"
}
```

### Pain Point Detected
```json
{
  "type": "pain_point_detected",
  "label": "Billing Issue",
  "text": "We've been charged twice this month.",
  "speaker": "Customer",
  "timestamp": "2026-02-24T10:30:15Z"
}
```

### Action Suggestion
```json
{
  "type": "action_suggestion",
  "text": "Follow up with billing department about double charge.",
  "priority": "high"
}
```

## Troubleshooting

### Issue: "Failed to load Jitsi Meet API"

**Cause:** The Jitsi web container isn't running or domain is wrong.

**Fix:**
```bash
docker-compose ps  # Check if jitsi_web is running
docker-compose logs jitsi_web  # Check logs
# Ensure JITSI_DOMAIN in frontend .env matches the actual domain
```

### Issue: Video doesn't connect (stuck on "Connecting...")

**Cause:** JVB ports not accessible or `JVB_ADVERTISE_IPS` is wrong.

**Fix:**
1. Ensure UDP port 10000 and TCP port 4443 are open in your firewall
2. Set `JVB_ADVERTISE_IPS` to your server's public IP
3. Restart JVB: `docker-compose restart jitsi_jvb`

### Issue: Webhooks not firing

**Cause:** Prosody can't reach the backend or webhook secret mismatch.

**Fix:**
1. Check `CONFERENCE_WEBHOOK_URL` points to the backend container hostname: `http://backend:8000/api/v1/webhooks/jitsi/event`
2. Verify `JITSI_WEBHOOK_SECRET` matches in both `.env` files
3. Check Prosody logs: `docker-compose logs jitsi_prosody | grep webhook`

### Issue: "Meeting not found" after quick start

**Cause:** Database not initialized or connection issue.

**Fix:**
```bash
# Check if backend can reach database
docker-compose logs backend | grep -i error
# Run migrations
docker-compose exec backend alembic upgrade head
```

## API Reference Summary

### Meeting Endpoints

| Method | Endpoint                    | Description                          |
|--------|----------------------------|--------------------------------------|
| POST   | `/meetings`                | Create a scheduled meeting           |
| GET    | `/meetings`                | List all meetings (paginated)        |
| GET    | `/meetings/{id}`           | Get meeting details                  |
| PUT    | `/meetings/{id}`           | Update meeting                       |
| DELETE | `/meetings/{id}`           | Delete meeting                       |
| **POST**   | **`/meetings/quick-start`**    | **Create + start meeting instantly** |
| **POST**   | **`/meetings/{id}/start`**     | **Start a scheduled meeting**        |
| **POST**   | **`/meetings/{id}/join`**      | **Get room URL to join**             |
| **GET**    | **`/meetings/{id}/jitsi`**     | **Get Jitsi room info (read-only)**  |

### Webhook Endpoints

| Method | Endpoint                                    | Description                    |
|--------|---------------------------------------------|--------------------------------|
| POST   | `/webhooks/jitsi/event/conference-started` | Room created                   |
| POST   | `/webhooks/jitsi/event/conference-ended`   | Room destroyed                 |
| POST   | `/webhooks/jitsi/event/participant-joined` | Participant joined             |
| POST   | `/webhooks/jitsi/event/participant-left`   | Participant left               |
| POST   | `/webhooks/jitsi/transcript`               | Transcriber delivers audio/JSON|

### WebSocket Endpoints

| Endpoint            | Description                      |
|---------------------|----------------------------------|
| `ws://host/live/{id}` | Live AI analysis during meeting |

## Conclusion

The Jitsi Meet integration provides a complete video conferencing solution embedded directly into the AI Call Intelligence platform, with real-time AI analysis capabilities that run during live meetings. All meeting data flows automatically into the existing AI processing pipeline for post-meeting insights.

For questions or issues, check the logs:
```bash
# Backend
docker-compose logs backend -f

# Jitsi
docker-compose logs jitsi_web jitsi_prosody jitsi_jvb -f

# Frontend
npm run dev  # Check terminal output
```
