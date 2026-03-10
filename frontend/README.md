# AI Meet – Frontend

React + TypeScript + Vite frontend for the AI Meet video conferencing platform.

## Tech Stack

- **React 18** – UI framework
- **TypeScript** – Type safety
- **Vite** – Build tool & dev server
- **Socket.IO Client** – Real-time communication
- **WebRTC** – Peer-to-peer video/audio

## Project Structure

```
frontend/
├── index.html            # HTML entry point
├── package.json          # Dependencies & scripts
├── vite.config.ts        # Vite configuration (proxy to backend)
├── tsconfig.json         # TypeScript configuration
└── src/
    ├── main.tsx              # App entry point
    ├── App.tsx               # Main app with routing (home, create, preview, meeting, dashboard)
    ├── App.css               # All application styles (Google Meet-inspired)
    ├── MeetingRoom.tsx       # Video call room (WebRTC, chat, screen share, recording)
    ├── MeetingSummary.tsx    # Post-meeting insights (transcript, pain points, actions, recording)
    ├── AnalyticsDashboard.tsx # Dashboard with meeting history & recordings
    ├── api.ts                # REST API helper functions
    ├── index.css             # Global CSS reset
    └── vite-env.d.ts         # Vite type declarations
```

## Features

- **Google Meet-style home page** with 3 meeting options:
  - Create a meeting for later (generates a shareable link)
  - Start an instant meeting (jumps straight in)
  - Schedule in Calendar (pre-fills date/time)
- **Video call room** with:
  - WebRTC peer-to-peer video/audio
  - Screen sharing
  - In-call chat
  - Live captions (Web Speech API)
  - Emoji reactions & hand raise
  - Meeting recording (auto-uploads to server)
  - Host controls (waiting room, admit/deny)
- **Analytics Dashboard** – View all meetings with recording playback
- **Meeting Summary** – Post-call transcript, pain points, action items, sentiment analysis

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (proxies API calls to backend on port 8000)
npm run dev

# Build for production
npm run build
```

The dev server runs on **http://localhost:3000** and proxies `/api` and `/socket.io` to the backend at `http://127.0.0.1:8000`.

## Environment

No environment variables needed for the frontend. API configuration is handled via the Vite proxy in `vite.config.ts`.
