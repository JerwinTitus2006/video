import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import MeetingRoom from './MeetingRoom';
import './App.css';

type Page = 'home' | 'preview' | 'meeting';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState('');
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Check for room code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomId(room);
  }, []);

  // Keep preview video in sync with stream
  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, page]);

  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      setLocalStream(stream);
      return stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setVideoEnabled(false);
        return stream;
      } catch {
        setError('Could not access camera or microphone');
        return null;
      }
    }
  }, []);

  // ---- actions ----
  const createMeeting = async () => {
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      setRoomId(data.roomId);
      setError('');
      setPage('preview');
      await initMedia();
    } catch {
      setError('Failed to create meeting. Is the server running?');
    }
  };

  const joinMeeting = async () => {
    if (!roomId.trim()) { setError('Enter a meeting code'); return; }
    setError('');
    setPage('preview');
    await initMedia();
  };

  const togglePreviewAudio = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !audioEnabled; });
    setAudioEnabled(prev => !prev);
  };

  const togglePreviewVideo = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !videoEnabled; });
    setVideoEnabled(prev => !prev);
  };

  const startMeeting = () => {
    if (!userName.trim()) { setError('Enter your name'); return; }
    const sock = io('', { transports: ['websocket', 'polling'] });
    setSocket(sock);
    setPage('meeting');
    window.history.pushState({}, '', `?room=${roomId}`);
  };

  const handleLeave = () => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    socket?.disconnect();
    setSocket(null);
    setPage('home');
    setRoomId('');
    setUserName('');
    window.history.pushState({}, '', window.location.pathname);
  };

  /* ================================================================ */
  /*  Meeting view                                                     */
  /* ================================================================ */
  if (page === 'meeting' && socket) {
    return (
      <MeetingRoom
        socket={socket}
        roomId={roomId}
        userName={userName}
        initialAudioEnabled={audioEnabled}
        initialVideoEnabled={videoEnabled}
        initialStream={localStream}
        onLeave={handleLeave}
      />
    );
  }

  /* ================================================================ */
  /*  Preview (pre-join) view                                          */
  /* ================================================================ */
  if (page === 'preview') {
    return (
      <div className="app dark">
        <div className="preview-page">
          <div className="preview-container">
            <div className="preview-video-box">
              <video
                ref={previewVideoRef}
                autoPlay playsInline muted
                className={`preview-video${!videoEnabled ? ' hidden-video' : ''}`}
              />
              {!videoEnabled && (
                <div className="preview-avatar">
                  <div className="avatar-circle lg">{userName ? userName[0].toUpperCase() : '?'}</div>
                </div>
              )}
              <div className="preview-btns">
                <button className={`pv-btn${!audioEnabled ? ' off' : ''}`} onClick={togglePreviewAudio} title="Toggle mic">
                  {audioEnabled ? '🎤' : '🔇'}
                </button>
                <button className={`pv-btn${!videoEnabled ? ' off' : ''}`} onClick={togglePreviewVideo} title="Toggle camera">
                  {videoEnabled ? '📹' : '📷'}
                </button>
              </div>
            </div>

            <div className="preview-info">
              <h2>Ready to join?</h2>
              <p className="room-code-label">{roomId}</p>
              <input
                className="name-input"
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={e => { setUserName(e.target.value); setError(''); }}
                maxLength={30}
                onKeyDown={e => e.key === 'Enter' && startMeeting()}
                autoFocus
              />
              {error && <p className="err">{error}</p>}
              <div className="preview-actions">
                <button className="join-now-btn" onClick={startMeeting}>Join now</button>
                <button className="back-btn" onClick={() => {
                  localStream?.getTracks().forEach(t => t.stop());
                  setLocalStream(null);
                  setPage('home');
                }}>Back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Home (landing) view                                              */
  /* ================================================================ */
  return (
    <div className="app">
      <header className="home-header">
        <div className="brand">
          <svg className="brand-icon" width="32" height="32" viewBox="0 0 24 24" fill="#1a73e8">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
          <h1>AI Meet</h1>
        </div>
        <div className="header-time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </header>

      <main className="home-main">
        <div className="home-content">
          <div className="home-left">
            <h2>Premium video meetings.<br />Now free for everyone.</h2>
            <p className="home-subtitle">
              AI Meet provides secure, high-quality video calls with real-time
              transcription, screen sharing, chat, and more.
            </p>

            <div className="home-actions">
              <button className="new-meeting-btn" onClick={createMeeting}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                New meeting
              </button>
              <div className="join-group">
                <input
                  className="code-input"
                  type="text"
                  placeholder="Enter a code"
                  value={roomId}
                  onChange={e => { setRoomId(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && joinMeeting()}
                />
                <button className="join-text-btn" onClick={joinMeeting} disabled={!roomId.trim()}>
                  Join
                </button>
              </div>
            </div>
            {error && <p className="err">{error}</p>}
          </div>

          <div className="home-right">
            <div className="hero-card">
              <div className="hero-grid">
                {['A', 'B', 'C', 'D'].map(l => (
                  <div key={l} className="hero-tile">
                    <div className="avatar-circle">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="features-row">
          {[
            { icon: '🔒', title: 'Secure', desc: 'Encrypted peer-to-peer calls' },
            { icon: '📝', title: 'Live Captions', desc: 'AI real-time transcription' },
            { icon: '🖥️', title: 'Screen Share', desc: 'Present to everyone' },
            { icon: '💬', title: 'In-call Chat', desc: 'Message during meetings' },
            { icon: '⏺️', title: 'Recording', desc: 'Save meetings locally' },
            { icon: '✋', title: 'Reactions', desc: 'Raise hand & emoji' },
          ].map(f => (
            <div key={f.title} className="feat">
              <span className="feat-icon">{f.icon}</span>
              <div><strong>{f.title}</strong><br /><small>{f.desc}</small></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
