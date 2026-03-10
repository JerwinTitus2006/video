import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import MeetingRoom from './MeetingRoom';
import MeetingSummary from './MeetingSummary';
import AnalyticsDashboard from './AnalyticsDashboard';
import './App.css';

type Page = 'home' | 'create' | 'preview' | 'waiting' | 'meeting' | 'summary' | 'dashboard';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState('');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);
  const [requireAdmission, setRequireAdmission] = useState(true);

  // Create meeting form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // GMeet-style "New meeting" dropdown
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);

  // "Your meeting's ready" popup state
  const [showMeetingReady, setShowMeetingReady] = useState(false);
  const [meetingReadyCode, setMeetingReadyCode] = useState('');
  const [meetingReadyCopied, setMeetingReadyCopied] = useState(false);
  const [showInviteFromPopup, setShowInviteFromPopup] = useState(false);
  const [popupInviteEmail, setPopupInviteEmail] = useState('');
  const [popupInviteStatus, setPopupInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [popupInviteError, setPopupInviteError] = useState('');

  // Waiting room state
  const [waitingMessage, setWaitingMessage] = useState('Waiting for the host to let you in...');
  const [denied, setDenied] = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Check for room code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomId(room);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNewMeetingMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.new-meeting-dropdown')) setShowNewMeetingMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showNewMeetingMenu]);

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

  /** Open the "New Meeting" creation dialog */
  const openCreateMeeting = () => {
    setMeetingTitle('');
    setScheduleDate('');
    setScheduleTime('');
    setCreatedRoomCode('');
    setRequireAdmission(true);
    setError('');
    setPage('create');
    setShowNewMeetingMenu(false);
  };

  /** Start an instant meeting (no form, auto-create and show "Your meeting's ready" popup) */
  const startInstantMeeting = async () => {
    setShowNewMeetingMenu(false);
    const name = userName.trim() || 'Host';
    if (!userName.trim()) setUserName(name);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Instant Meeting',
          host_name: name,
          scheduled_at: null,
          require_admission: false,
        }),
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setCreatedRoomCode(data.roomId);
      if (data.meetingId) setMeetingId(data.meetingId);
      setIsHost(true);
      setHostName(name);
      setRequireAdmission(false);
      setError('');
      // Show "Your meeting's ready" popup
      setMeetingReadyCode(data.roomId);
      setShowMeetingReady(true);
      setMeetingReadyCopied(false);
      setShowInviteFromPopup(false);
      setPopupInviteEmail('');
      setPopupInviteStatus('idle');
    } catch {
      setError('Failed to create meeting. Is the server running?');
    }
  };

  /** Copy link from the "meeting ready" popup */
  const copyMeetingReadyLink = () => {
    const link = `${window.location.origin}?room=${meetingReadyCode}`;
    navigator.clipboard.writeText(link);
    setMeetingReadyCopied(true);
    setTimeout(() => setMeetingReadyCopied(false), 2500);
  };

  /** Join the instant meeting from the popup */
  const joinInstantMeeting = async () => {
    setShowMeetingReady(false);
    setPage('preview');
    await initMedia();
  };

  /** Send email invite from the popup */
  const sendPopupInvite = async () => {
    if (!popupInviteEmail.trim()) return;
    setPopupInviteStatus('sending');
    setPopupInviteError('');
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: popupInviteEmail.trim(),
          room_id: meetingReadyCode,
          host_name: userName || 'Host',
          meeting_link: `${window.location.origin}?room=${meetingReadyCode}`,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setPopupInviteStatus('sent');
        setPopupInviteEmail('');
        setTimeout(() => setPopupInviteStatus('idle'), 3000);
      } else {
        setPopupInviteStatus('error');
        setPopupInviteError(data.error || 'Failed to send invite');
      }
    } catch {
      setPopupInviteStatus('error');
      setPopupInviteError('Network error. Check server.');
    }
  };

  /** Create a meeting for later (generates link only, shows the shareable code) */
  const createMeetingForLater = async () => {
    setShowNewMeetingMenu(false);
    const name = userName.trim() || 'Host';
    if (!userName.trim()) setUserName(name);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Meeting',
          host_name: name,
          scheduled_at: null,
          require_admission: true,
        }),
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setCreatedRoomCode(data.roomId);  // triggers the "Meeting created" card
      if (data.meetingId) setMeetingId(data.meetingId);
      setIsHost(true);
      setHostName(name);
      setMeetingTitle('');
      setScheduleDate('');
      setScheduleTime('');
      setError('');
      setPage('create');  // will show "Meeting created!" since createdRoomCode is set
    } catch {
      setError('Failed to create meeting. Is the server running?');
    }
  };

  /** Schedule in Calendar (opens create page with schedule fields) */
  const openScheduleMeeting = () => {
    setShowNewMeetingMenu(false);
    setMeetingTitle('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('10:00');
    setCreatedRoomCode('');
    setRequireAdmission(true);
    setError('');
    setPage('create');
  };

  /** Actually create the meeting on the server */
  const createMeeting = async () => {
    if (!userName.trim()) { setError('Enter your name'); return; }
    try {
      let scheduledAt: string | null = null;
      if (scheduleDate && scheduleTime) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle || 'Untitled Meeting',
          host_name: userName,
          scheduled_at: scheduledAt,
          require_admission: requireAdmission,
        }),
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setCreatedRoomCode(data.roomId);
      if (data.meetingId) setMeetingId(data.meetingId);
      setIsHost(true);
      setHostName(userName);
      setError('');
    } catch {
      setError('Failed to create meeting. Is the server running?');
    }
  };

  /** Copy the meeting code/link */
  const copyMeetingCode = () => {
    const link = `${window.location.origin}?room=${createdRoomCode}`;
    navigator.clipboard.writeText(link);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  /** Start meeting now (host clicks "Start meeting" after creation) */
  const startMeetingNow = async () => {
    setPage('preview');
    await initMedia();
  };

  const joinMeeting = async () => {
    if (!roomId.trim()) { setError('Enter a meeting code'); return; }
    // Extract room code from a pasted link
    let code = roomId.trim();
    try {
      const url = new URL(code);
      const r = url.searchParams.get('room');
      if (r) code = r;
    } catch {
      // not a URL, use as-is
    }
    setRoomId(code);

    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (!data.exists) {
        setError('Meeting not found. Check the code and try again.');
        return;
      }
      if (data.meetingId) setMeetingId(data.meetingId);
      if (data.hostName) setHostName(data.hostName);
      setRequireAdmission(data.requireAdmission ?? true);
      setIsHost(false);
      setError('');
      setPage('preview');
      await initMedia();
    } catch {
      setError('Failed to check room. Is the server running?');
    }
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

    // If require_admission and not host, go to waiting room first
    if (requireAdmission && !isHost) {
      setDenied(false);
      setWaitingMessage('Waiting for the host to let you in...');
      setPage('waiting');

      // Listen for waiting room / admitted / denied events
      sock.on('waiting_room', ({ message }: any) => {
        setWaitingMessage(message || 'Waiting for the host to let you in...');
      });
      sock.on('room_joined', () => {
        // We got admitted! Move to meeting
        setPage('meeting');
      });
      sock.on('denied', ({ message }: any) => {
        setDenied(true);
        setWaitingMessage(message || 'The host has denied your request to join.');
      });

      // Join (server will put us in waiting room)
      sock.emit('join_room', {
        roomId: roomId,
        userName: userName,
        audioEnabled,
        videoEnabled,
        isHost: false,
      });

      window.history.pushState({}, '', `?room=${roomId}`);
    } else {
      // Direct join (host or no admission required)
      sock.emit('join_room', {
        roomId: roomId,
        userName: userName,
        audioEnabled,
        videoEnabled,
        isHost,
      });
      setPage('meeting');
      window.history.pushState({}, '', `?room=${roomId}`);
    }
  };

  const handleLeave = (returnedMeetingId?: string | null) => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    socket?.disconnect();
    setSocket(null);
    window.history.pushState({}, '', window.location.pathname);
    const mid = returnedMeetingId || meetingId;
    if (mid) {
      setMeetingId(mid);
      setTimeout(() => setPage('summary'), 500);
    } else {
      setMeetingId(null);
      setPage('home');
      setRoomId('');
      setUserName('');
      setIsHost(false);
    }
  };

  const goHome = () => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    socket?.disconnect();
    setSocket(null);
    setPage('home');
    setRoomId('');
    setUserName('');
    setIsHost(false);
    setCreatedRoomCode('');
    setDenied(false);
    window.history.pushState({}, '', window.location.pathname);
  };

  /* ================================================================ */
  /*  Summary view                                                     */
  /* ================================================================ */
  if (page === 'summary' && meetingId) {
    return (
      <MeetingSummary
        meetingId={meetingId}
        onBack={() => {
          setMeetingId(null);
          setRoomId('');
          setUserName('');
          setPage('home');
        }}
      />
    );
  }

  /* ================================================================ */
  /*  Dashboard view                                                   */
  /* ================================================================ */
  if (page === 'dashboard') {
    return (
      <AnalyticsDashboard
        onBack={() => setPage('home')}
        onViewMeeting={(id) => { setMeetingId(id); setPage('summary'); }}
      />
    );
  }

  /* ================================================================ */
  /*  Meeting view                                                     */
  /* ================================================================ */
  if (page === 'meeting' && socket) {
    return (
      <MeetingRoom
        socket={socket}
        roomId={roomId}
        userName={userName}
        meetingId={meetingId}
        isHost={isHost}
        initialAudioEnabled={audioEnabled}
        initialVideoEnabled={videoEnabled}
        initialStream={localStream}
        onLeave={handleLeave}
      />
    );
  }

  /* ================================================================ */
  /*  Waiting Room                                                     */
  /* ================================================================ */
  if (page === 'waiting') {
    return (
      <div className="app dark">
        <div className="waiting-room-page">
          <div className="waiting-room-card">
            <div className="waiting-room-icon">
              {denied ? '🚫' : '⏳'}
            </div>
            <h2>{denied ? 'Access Denied' : 'Waiting to be admitted'}</h2>
            <p className="waiting-room-msg">{waitingMessage}</p>
            {!denied && (
              <div className="waiting-room-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            )}
            <p className="waiting-room-sub">
              {denied
                ? 'The host has denied your entry. You can try again or go back.'
                : `You'll join the meeting when the host lets you in.`}
            </p>
            <button className="back-btn" onClick={goHome}>
              {denied ? 'Go back' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Create Meeting view                                              */
  /* ================================================================ */
  if (page === 'create') {
    return (
      <div className="app">
        <header className="home-header">
          <div className="brand">
            <svg className="brand-icon" width="32" height="32" viewBox="0 0 24 24" fill="#1a73e8">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <h1>AI Meet</h1>
          </div>
          <button className="back-link" onClick={goHome}>← Back to Home</button>
        </header>

        <main className="create-meeting-page">
          <div className="create-meeting-card">
            <h2>Create a new meeting</h2>

            {!createdRoomCode ? (
              /* ── Creation Form ── */
              <div className="create-form">
                <div className="form-group">
                  <label>Your name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={e => { setUserName(e.target.value); setError(''); }}
                    maxLength={30}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Meeting title (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Team standup"
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group half">
                    <label>Schedule date (optional)</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group half">
                    <label>Schedule time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      disabled={!scheduleDate}
                    />
                  </div>
                </div>
                <div className="form-group toggle-group">
                  <label className="toggle-label">
                    <span>Require host to admit participants</span>
                    <button
                      type="button"
                      className={`toggle-switch${requireAdmission ? ' on' : ''}`}
                      onClick={() => setRequireAdmission(!requireAdmission)}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </label>
                  <small className="toggle-hint">
                    {requireAdmission
                      ? 'Participants will wait until you admit them'
                      : 'Anyone with the code can join directly'}
                  </small>
                </div>

                {error && <p className="err">{error}</p>}

                <button className="create-btn" onClick={createMeeting}>
                  Create meeting
                </button>
              </div>
            ) : (
              /* ── Meeting Created – Show code ── */
              <div className="meeting-created">
                <div className="created-icon">✅</div>
                <h3>Meeting created!</h3>

                <div className="meeting-code-box">
                  <span className="code-label">Meeting code</span>
                  <span className="code-value">{createdRoomCode}</span>
                  <button className="copy-code-btn" onClick={copyMeetingCode}>
                    {codeCopied ? '✓ Copied!' : '📋 Copy link'}
                  </button>
                </div>

                <div className="meeting-link-box">
                  <span className="link-label">Share this link</span>
                  <span className="link-value">{window.location.origin}?room={createdRoomCode}</span>
                </div>

                {meetingTitle && (
                  <p className="created-title">📌 {meetingTitle}</p>
                )}
                {scheduleDate && scheduleTime && (
                  <p className="created-schedule">
                    📅 Scheduled for {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                  </p>
                )}

                <div className="created-actions">
                  <button className="start-now-btn" onClick={startMeetingNow}>
                    🎥 Start meeting now
                  </button>
                  <button className="back-btn" onClick={goHome}>
                    Back to home
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
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
              {isHost && <span className="host-badge-preview">👑 You are the host</span>}
              {!isHost && requireAdmission && (
                <span className="waiting-hint">⏳ You'll need to wait for the host to admit you</span>
              )}
              <input
                className="name-input"
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={e => { setUserName(e.target.value); setError(''); }}
                maxLength={30}
                onKeyDown={e => e.key === 'Enter' && startMeeting()}
                autoFocus={!userName}
              />
              {error && <p className="err">{error}</p>}
              <div className="preview-actions">
                <button className="join-now-btn" onClick={startMeeting}>
                  {isHost ? 'Start meeting' : 'Ask to join'}
                </button>
                <button className="back-btn" onClick={goHome}>Back</button>
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

            <div className="home-name-row">
              <input
                className="home-name-input"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={e => { setUserName(e.target.value); setError(''); }}
                maxLength={30}
              />
            </div>

            <div className="home-actions">
              <div className="new-meeting-dropdown">
                <button className="new-meeting-btn" onClick={() => setShowNewMeetingMenu(!showNewMeetingMenu)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                  New meeting
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4}}><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                {showNewMeetingMenu && (
                  <div className="meeting-dropdown-menu">
                    <button className="dropdown-item" onClick={createMeetingForLater}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                      Create a meeting for later
                    </button>
                    <button className="dropdown-item" onClick={startInstantMeeting}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                      Start an instant meeting
                    </button>
                    <button className="dropdown-item" onClick={openScheduleMeeting}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                      Schedule in Calendar
                    </button>
                  </div>
                )}
              </div>
              <div className="divider-line"></div>
              <div className="join-group">
                <input
                  className="code-input"
                  type="text"
                  placeholder="Enter a code or link"
                  value={roomId}
                  onChange={e => { setRoomId(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && joinMeeting()}
                />
                <button className="join-text-btn" onClick={joinMeeting} disabled={!roomId.trim()}>
                  Join
                </button>
              </div>
            </div>
            <div className="home-secondary-actions">
              <button className="dashboard-btn" onClick={() => setPage('dashboard')}>
                📊 Dashboard
              </button>
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

        {/* ── "Your meeting's ready" popup (GMeet-style) ── */}
        {showMeetingReady && (
          <div className="meeting-ready-overlay">
            <div className="meeting-ready-popup">
              <button className="meeting-ready-close" onClick={() => setShowMeetingReady(false)}>✕</button>
              <h3 className="meeting-ready-title">Your meeting's ready</h3>

              {!showInviteFromPopup ? (
                <>
                  <p className="meeting-ready-desc">
                    Share this meeting link with others you want in the meeting
                  </p>

                  <div className="meeting-ready-link-box">
                    <span className="meeting-ready-link">
                      {window.location.origin}?room={meetingReadyCode}
                    </span>
                    <button className="meeting-ready-copy" onClick={copyMeetingReadyLink} title="Copy link">
                      {meetingReadyCopied ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                      )}
                    </button>
                  </div>

                  <div className="meeting-ready-actions">
                    <button className="meeting-ready-add-btn" onClick={() => setShowInviteFromPopup(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      Add others
                    </button>
                    <button className="meeting-ready-join-btn" onClick={joinInstantMeeting}>
                      Join now
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="meeting-ready-desc">Send an email invite</p>
                  <div className="meeting-ready-invite-row">
                    <input
                      type="email"
                      className="meeting-ready-email"
                      placeholder="Enter email address"
                      value={popupInviteEmail}
                      onChange={e => { setPopupInviteEmail(e.target.value); setPopupInviteError(''); setPopupInviteStatus('idle'); }}
                      onKeyDown={e => e.key === 'Enter' && sendPopupInvite()}
                      autoFocus
                    />
                    <button
                      className="meeting-ready-send"
                      onClick={sendPopupInvite}
                      disabled={!popupInviteEmail.trim() || popupInviteStatus === 'sending'}
                    >
                      {popupInviteStatus === 'sending' ? '⏳' : '📧'}
                    </button>
                  </div>
                  {popupInviteStatus === 'sent' && <p className="invite-success">✓ Invitation sent!</p>}
                  {popupInviteError && <p className="invite-error">{popupInviteError}</p>}
                  <div className="meeting-ready-actions">
                    <button className="meeting-ready-back-btn" onClick={() => setShowInviteFromPopup(false)}>
                      ← Back
                    </button>
                    <button className="meeting-ready-join-btn" onClick={joinInstantMeeting}>
                      Join now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="features-row">
          {[
            { icon: '🔒', title: 'Secure', desc: 'Encrypted peer-to-peer calls' },
            { icon: '📝', title: 'Live Captions', desc: 'AI real-time transcription' },
            { icon: '🖥️', title: 'Screen Share', desc: 'Present to everyone' },
            { icon: '💬', title: 'In-call Chat', desc: 'Message during meetings' },
            { icon: '👑', title: 'Host Controls', desc: 'Admit & manage participants' },
            { icon: '📊', title: 'Insights', desc: 'Sentiment & action items' },
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
