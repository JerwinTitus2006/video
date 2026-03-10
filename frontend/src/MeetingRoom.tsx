import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Participant {
  sid: string;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderSid: string;
  message: string;
  timestamp: string;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

interface PainPointAlert {
  id: string;
  text: string;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
}

interface Props {
  socket: Socket;
  roomId: string;
  userName: string;
  meetingId?: string | null;
  isHost?: boolean;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  initialStream: MediaStream | null;
  onLeave: (meetingId?: string | null) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/* ------------------------------------------------------------------ */
/*  VideoTile                                                          */
/* ------------------------------------------------------------------ */
function VideoTile({
  stream, name, audioEnabled, videoEnabled, isLocal, handRaised,
}: {
  stream?: MediaStream;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
  handRaised?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null;
  }, [stream]);

  const hasVideo = videoEnabled && stream && stream.getVideoTracks().some(t => t.enabled);

  return (
    <div className={`video-tile${isLocal ? ' local-tile' : ''}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isLocal}
        style={{ display: hasVideo ? 'block' : 'none' }}
      />
      {!hasVideo && (
        <div className="no-video">
          <div className="avatar-circle">{name.charAt(0).toUpperCase()}</div>
        </div>
      )}
      <div className="tile-bar">
        {handRaised && <span className="hand-badge">✋</span>}
        {!audioEnabled && <span className="mute-badge">🔇</span>}
        <span className="tile-name">{name}{isLocal ? ' (You)' : ''}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MeetingRoom                                                        */
/* ------------------------------------------------------------------ */
export default function MeetingRoom({
  socket, roomId, userName, meetingId,
  isHost = false,
  initialAudioEnabled, initialVideoEnabled, initialStream,
  onLeave,
}: Props) {
  /* ---- state ---------------------------------------------------- */
  const [participants, setP] = useState<Map<string, Participant>>(new Map());
  const [audioEnabled, setAudio] = useState(initialAudioEnabled);
  const [videoEnabled, setVideo] = useState(initialVideoEnabled);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sidePanel, setSidePanel] = useState<'none' | 'chat' | 'people' | 'transcript' | 'waiting'>('none');
  const [captionsOn, setCaptionsOn] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [captions, setCaptions] = useState<Map<string, { name: string; text: string }>>(new Map());
  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [unread, setUnread] = useState(0);
  const [copied, setCopied] = useState(false);
  const [amHost, setAmHost] = useState(isHost);

  // ── Waiting room state (host only) ──
  const [waitingList, setWaitingList] = useState<Record<string, { name: string }>>({});
  const [waitingCount, setWaitingCount] = useState(0);

  // ── AI Intelligence state ──
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [painAlerts, setPainAlerts] = useState<PainPointAlert[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(meetingId ?? null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  // ── Email invite state ──
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');

  /* ---- refs ----------------------------------------------------- */
  const localStream = useRef<MediaStream | null>(initialStream);
  const screenStream = useRef<MediaStream | null>(null);
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recognition = useRef<any>(null);
  const captionsOnRef = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const t0 = useRef(Date.now());
  const joinedRef = useRef(false);

  /* ---- helpers -------------------------------------------------- */
  const setParticipant = useCallback(
    (sid: string, fn: (prev?: Participant) => Participant | undefined) => {
      setP(prev => {
        const m = new Map(prev);
        const result = fn(m.get(sid));
        if (result) m.set(sid, result);
        else m.delete(sid);
        return m;
      });
    },
    [],
  );

  /* ---- timer ---------------------------------------------------- */
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  /* ---- auto-scroll chat ---------------------------------------- */
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  /* ---- create RTCPeerConnection --------------------------------- */
  const createPC = useCallback(
    (remoteSid: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // add local tracks
      localStream.current?.getTracks().forEach(t => pc.addTrack(t, localStream.current!));

      pc.onicecandidate = e => {
        if (e.candidate) socket.emit('ice_candidate', { target: remoteSid, candidate: e.candidate });
      };

      pc.ontrack = e => {
        const s = e.streams[0];
        if (s) setParticipant(remoteSid, prev => (prev ? { ...prev, stream: s } : undefined));
      };

      pcs.current.set(remoteSid, pc);
      return pc;
    },
    [socket, setParticipant],
  );

  /* ---- socket events -------------------------------------------- */
  useEffect(() => {
    // guard against React StrictMode double-mount
    if (joinedRef.current) return;
    joinedRef.current = true;

    // join
    socket.emit('join_room', {
      roomId,
      userName,
      audioEnabled: initialAudioEnabled,
      videoEnabled: initialVideoEnabled,
    });

    socket.on('room_joined', async ({ participants: existing, chatHistory, meetingId: mid, isHost: hostFlag, hostSid }: any) => {
      setChatMsgs(chatHistory || []);
      if (mid) setCurrentMeetingId(mid);
      if (hostFlag) setAmHost(true);
      for (const [sid, info] of Object.entries<any>(existing)) {
        setParticipant(sid, () => ({
          sid,
          name: info.name,
          audioEnabled: info.audioEnabled,
          videoEnabled: info.videoEnabled,
          handRaised: info.handRaised,
          screenSharing: info.screenSharing,
        }));
        const pc = createPC(sid);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { target: sid, sdp: pc.localDescription });
        } catch (err) {
          console.error('offer error', err);
        }
      }
    });

    socket.on('participant_joined', ({ sid, name, audioEnabled: a, videoEnabled: v }: any) => {
      setParticipant(sid, () => ({
        sid, name, audioEnabled: a, videoEnabled: v, handRaised: false, screenSharing: false,
      }));
    });

    socket.on('participant_left', ({ sid }: any) => {
      setParticipant(sid, () => undefined);
      const pc = pcs.current.get(sid);
      if (pc) { pc.close(); pcs.current.delete(sid); }
    });

    // WebRTC signaling
    socket.on('offer', async ({ sdp, sender }: any) => {
      let pc = pcs.current.get(sender);
      if (!pc) pc = createPC(sender);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        socket.emit('answer', { target: sender, sdp: pc.localDescription });
      } catch (err) { console.error('answer error', err); }
    });

    socket.on('answer', async ({ sdp, sender }: any) => {
      const pc = pcs.current.get(sender);
      if (pc) try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); } catch {}
    });

    socket.on('ice_candidate', async ({ candidate, sender }: any) => {
      const pc = pcs.current.get(sender);
      if (pc && candidate) try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    // media state
    socket.on('participant_audio_changed', ({ sid, enabled }: any) =>
      setParticipant(sid, p => (p ? { ...p, audioEnabled: enabled } : undefined)));

    socket.on('participant_video_changed', ({ sid, enabled }: any) =>
      setParticipant(sid, p => (p ? { ...p, videoEnabled: enabled } : undefined)));

    socket.on('screen_share_changed', ({ sid, sharing }: any) =>
      setParticipant(sid, p => (p ? { ...p, screenSharing: sharing } : undefined)));

    // chat
    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMsgs(prev => [...prev, msg]);
      setUnread(prev => prev + 1);
    });

    // hand raise
    socket.on('hand_raise_changed', ({ sid, raised }: any) =>
      setParticipant(sid, p => (p ? { ...p, handRaised: raised } : undefined)));

    // reactions
    socket.on('reaction', ({ sid, name, emoji }: any) => {
      const id = `${Date.now()}-${sid}`;
      setReactions(prev => [...prev, { id, emoji, name }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
    });

    // captions
    socket.on('caption', ({ sid, name, text, isFinal }: any) => {
      setCaptions(prev => { const m = new Map(prev); m.set(sid, { name, text }); return m; });
      if (isFinal) {
        setTimeout(() => setCaptions(prev => {
          const m = new Map(prev);
          if (m.get(sid)?.text === text) m.delete(sid);
          return m;
        }), 4000);
      }
    });

    // ── AI intelligence events ──
    socket.on('new_transcript', (t: TranscriptEntry) => {
      setTranscripts(prev => [...prev, t]);
    });

    socket.on('pain_point_detected', (pp: PainPointAlert) => {
      setPainAlerts(prev => [...prev, pp]);
      // Auto-dismiss after 8s
      setTimeout(() => setPainAlerts(prev => prev.filter(a => a.id !== pp.id)), 8000);
    });

    socket.on('processing_complete', ({ summary }: any) => {
      setAiProcessing(false);
      // Could trigger a notification or navigate to summary
      console.log('AI Processing complete:', summary);
    });

    socket.on('meeting_ended', () => {
      setAiProcessing(true);
    });

    // ── Host: waiting room updates ──
    socket.on('waiting_room_update', ({ waiting }: any) => {
      setWaitingList(waiting || {});
      setWaitingCount(Object.keys(waiting || {}).length);
    });

    return () => {
      joinedRef.current = false;
      [
        'room_joined', 'participant_joined', 'participant_left',
        'offer', 'answer', 'ice_candidate',
        'participant_audio_changed', 'participant_video_changed', 'screen_share_changed',
        'chat_message', 'hand_raise_changed', 'reaction', 'caption',
        'new_transcript', 'pain_point_detected', 'processing_complete', 'meeting_ended',
        'waiting_room_update',
      ].forEach(e => socket.off(e));
    };
  }, [socket, roomId, userName, initialAudioEnabled, initialVideoEnabled, createPC, setParticipant]);

  /* ---- clear unread when chat open ------------------------------ */
  useEffect(() => { if (sidePanel === 'chat') setUnread(0); }, [sidePanel, chatMsgs]);

  /* ---- auto-scroll transcript ---------------------------------- */
  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  /* ---- toggle audio --------------------------------------------- */
  const toggleAudio = () => {
    const s = localStream.current;
    if (!s) return;
    s.getAudioTracks().forEach(t => { t.enabled = !audioEnabled; });
    setAudio(!audioEnabled);
    socket.emit('toggle_audio', { roomId, enabled: !audioEnabled });
  };

  /* ---- toggle video --------------------------------------------- */
  const toggleVideo = async () => {
    const s = localStream.current;
    if (!s) return;
    if (videoEnabled) {
      s.getVideoTracks().forEach(t => { t.enabled = false; });
      setVideo(false);
      socket.emit('toggle_video', { roomId, enabled: false });
    } else {
      const vt = s.getVideoTracks();
      if (vt.length) {
        vt.forEach(t => { t.enabled = true; });
      } else {
        try {
          const ns = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
          const track = ns.getVideoTracks()[0];
          s.addTrack(track);
          pcs.current.forEach(pc => {
            const sender = pc.getSenders().find(x => x.track?.kind === 'video');
            if (sender) sender.replaceTrack(track); else pc.addTrack(track, s);
          });
        } catch { return; }
      }
      setVideo(true);
      socket.emit('toggle_video', { roomId, enabled: true });
    }
  };

  /* ---- screen share --------------------------------------------- */
  const toggleScreenShare = async () => {
    if (screenSharing) {
      screenStream.current?.getTracks().forEach(t => t.stop());
      screenStream.current = null;
      const cam = localStream.current?.getVideoTracks()[0];
      if (cam) pcs.current.forEach(pc => {
        const s = pc.getSenders().find(x => x.track?.kind === 'video');
        if (s) s.replaceTrack(cam);
      });
      setScreenSharing(false);
      socket.emit('screen_share', { roomId, sharing: false });
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = ss;
        const track = ss.getVideoTracks()[0];
        pcs.current.forEach(pc => {
          const s = pc.getSenders().find(x => x.track?.kind === 'video');
          if (s) s.replaceTrack(track);
        });
        track.onended = () => {
          screenStream.current = null;
          const cam = localStream.current?.getVideoTracks()[0];
          if (cam) pcs.current.forEach(pc => {
            const s = pc.getSenders().find(x => x.track?.kind === 'video');
            if (s) s.replaceTrack(cam);
          });
          setScreenSharing(false);
          socket.emit('screen_share', { roomId, sharing: false });
        };
        setScreenSharing(true);
        socket.emit('screen_share', { roomId, sharing: true });
      } catch { /* user cancelled */ }
    }
  };

  /* ---- chat ----------------------------------------------------- */
  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    socket.emit('chat_message', { roomId, message: msg });
    setChatInput('');
  };

  /* ---- hand raise ----------------------------------------------- */
  const toggleHand = () => {
    setHandRaised(prev => {
      socket.emit('hand_raise', { roomId, raised: !prev });
      return !prev;
    });
  };

  /* ---- reactions ------------------------------------------------ */
  const sendReaction = (emoji: string) => {
    socket.emit('reaction', { roomId, emoji });
    setShowEmojiPicker(false);
  };

  /* ---- captions (Web Speech API) -------------------------------- */
  const toggleCaptions = () => {
    if (captionsOn) {
      recognition.current?.stop();
      recognition.current = null;
      setCaptionsOn(false);
      captionsOnRef.current = false;
    } else {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { alert('Speech recognition not supported. Use Chrome.'); return; }
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = (e: any) => {
        let interim = '', final_ = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final_ += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        if (final_) socket.emit('caption', { roomId, text: final_, isFinal: true });
        else if (interim) socket.emit('caption', { roomId, text: interim, isFinal: false });
      };
      r.onend = () => { if (captionsOnRef.current) try { r.start(); } catch {} };
      r.onerror = () => {};
      r.start();
      recognition.current = r;
      setCaptionsOn(true);
      captionsOnRef.current = true;
    }
  };

  /* ---- recording ------------------------------------------------ */
  const toggleRecording = () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
    } else {
      try {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        const streams: MediaStream[] = [localStream.current!].filter(Boolean);
        pcs.current.forEach(pc =>
          pc.getReceivers().forEach(r => {
            if (r.track) {
              const ms = new MediaStream([r.track]);
              streams.push(ms);
            }
          }),
        );
        streams.forEach(s =>
          s.getAudioTracks().forEach(t => {
            ctx.createMediaStreamSource(new MediaStream([t])).connect(dest);
          }),
        );
        const combined = new MediaStream([...dest.stream.getTracks()]);
        const vt = (screenStream.current || localStream.current)?.getVideoTracks()[0];
        if (vt) combined.addTrack(vt);
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'audio/webm';
        const rec = new MediaRecorder(combined, { mimeType: mime });
        chunks.current = [];
        rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
        rec.onstop = async () => {
          const blob = new Blob(chunks.current, { type: mime });
          // Upload recording to server
          if (currentMeetingId) {
            try {
              const formData = new FormData();
              const ext = mime.startsWith('video') ? 'webm' : 'webm';
              formData.append('file', blob, `meeting-${roomId}.${ext}`);
              await fetch(`/api/meetings/${currentMeetingId}/recording`, {
                method: 'POST',
                body: formData,
              });
              console.log('Recording uploaded to server');
            } catch (err) {
              console.error('Failed to upload recording, downloading locally instead', err);
              // Fallback: download locally
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `meeting-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
              a.click();
              URL.revokeObjectURL(url);
            }
          } else {
            // No meeting ID, just download locally
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
        };
        rec.start(1000);
        recorder.current = rec;
        setRecording(true);
      } catch (err) { console.error('recording err', err); }
    }
  };

  /* ---- leave ---------------------------------------------------- */
  const leave = async () => {
    recognition.current?.stop();

    // If recording, stop and wait for upload to finish before leaving
    if (recording && recorder.current && recorder.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const origOnStop = recorder.current!.onstop as (() => void) | null;
        recorder.current!.onstop = async (ev: Event) => {
          // Run the original onstop (which uploads the recording)
          if (origOnStop) {
            await (origOnStop as any).call(recorder.current, ev);
          }
          resolve();
        };
        recorder.current!.stop();
      });
      setRecording(false);
    }

    // Trigger AI processing on the server
    socket.emit('end_meeting', { roomId });
    localStream.current?.getTracks().forEach(t => t.stop());
    screenStream.current?.getTracks().forEach(t => t.stop());
    pcs.current.forEach(pc => pc.close());
    socket.emit('leave_room', { roomId });
    onLeave(currentMeetingId);
  };

  /* ---- copy link ------------------------------------------------ */
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ---- send email invite --------------------------------------- */
  const sendEmailInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus('sending');
    setInviteError('');
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          room_id: roomId,
          host_name: userName,
          meeting_link: `${window.location.origin}?room=${roomId}`,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setInviteStatus('sent');
        setInviteEmail('');
        setTimeout(() => setInviteStatus('idle'), 3000);
      } else {
        setInviteStatus('error');
        setInviteError(data.error || 'Failed to send invite');
      }
    } catch {
      setInviteStatus('error');
      setInviteError('Network error. Check server.');
    }
  };

  /* ---- host: admit/deny participants ----------------------------- */
  const admitParticipant = (sid: string) => {
    socket.emit('admit_participant', { roomId, targetSid: sid });
  };

  const admitAll = () => {
    socket.emit('admit_all', { roomId });
  };

  const denyParticipant = (sid: string) => {
    socket.emit('deny_participant', { roomId, targetSid: sid });
  };

  /* ---- format helpers ------------------------------------------- */
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const fmtChat = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  /* ---- grid class ----------------------------------------------- */
  const total = participants.size + 1;
  const gc =
    total <= 1 ? 'g1' :
    total <= 2 ? 'g2' :
    total <= 4 ? 'g4' :
    total <= 6 ? 'g6' :
    total <= 9 ? 'g9' : 'g-many';

  /* ---- render --------------------------------------------------- */
  return (
    <div className="meeting-room">
      {/* ---- top bar ---- */}
      <div className="meeting-top-bar">
        <div className="meeting-info">
          <span className="meeting-title">AI Meet</span>
          {amHost && <span className="host-badge-room">👑 Host</span>}
          <span className="sep">|</span>
          <button className="meeting-code" onClick={copyLink} title="Copy meeting link">
            {roomId} {copied ? '✓ Copied' : '📋'}
          </button>
        </div>
        <div className="meeting-clock">
          {fmt(elapsed)}&nbsp;&middot;&nbsp;{total} participant{total !== 1 ? 's' : ''}
          {amHost && waitingCount > 0 && (
            <span className="waiting-badge" onClick={() => setSidePanel(sidePanel === 'waiting' ? 'none' : 'waiting')}>
              {waitingCount} waiting
            </span>
          )}
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="meeting-body">
        <div className={`video-grid ${gc}${sidePanel !== 'none' ? ' with-panel' : ''}`}>
          <VideoTile
            stream={screenSharing ? (screenStream.current ?? undefined) : (localStream.current ?? undefined)}
            name={userName}
            audioEnabled={audioEnabled}
            videoEnabled={screenSharing || videoEnabled}
            isLocal
            handRaised={handRaised}
          />
          {Array.from(participants.values()).map(p => (
            <VideoTile
              key={p.sid}
              stream={p.stream}
              name={p.name}
              audioEnabled={p.audioEnabled}
              videoEnabled={p.videoEnabled}
              handRaised={p.handRaised}
            />
          ))}
        </div>

        {/* ---- side panel ---- */}
        {sidePanel !== 'none' && (
          <div className="side-panel">
            <div className="panel-header">
              <h3>{sidePanel === 'chat' ? 'In-call messages' : sidePanel === 'transcript' ? 'Live Transcript' : sidePanel === 'waiting' ? 'Waiting Room' : 'People'}</h3>
              <button className="panel-close" onClick={() => setSidePanel('none')}>✕</button>
            </div>

            {sidePanel === 'waiting' && amHost && (
              <div className="waiting-panel">
                {Object.keys(waitingList).length === 0 ? (
                  <p className="chat-empty">No one is waiting to join.</p>
                ) : (
                  <>
                    <div className="waiting-admit-all">
                      <button className="admit-all-btn" onClick={admitAll}>
                        Admit all ({Object.keys(waitingList).length})
                      </button>
                    </div>
                    {Object.entries(waitingList).map(([sid, info]) => (
                      <div key={sid} className="waiting-person">
                        <div className="avatar-circle sm">{info.name.charAt(0).toUpperCase()}</div>
                        <span className="person-name">{info.name}</span>
                        <div className="waiting-actions">
                          <button className="admit-btn" onClick={() => admitParticipant(sid)} title="Admit">✓</button>
                          <button className="deny-btn" onClick={() => denyParticipant(sid)} title="Deny">✕</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {sidePanel === 'chat' && (
              <div className="chat-panel">
                <div className="chat-messages">
                  {chatMsgs.length === 0 && (
                    <p className="chat-empty">No messages yet. Say hi!</p>
                  )}
                  {chatMsgs.map(m => (
                    <div key={m.id} className="chat-msg">
                      <div className="chat-msg-head">
                        <span className="chat-sender">{m.sender}</span>
                        <span className="chat-time">{fmtChat(m.timestamp)}</span>
                      </div>
                      <p className="chat-text">{m.message}</p>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <div className="chat-input-row">
                  <input
                    placeholder="Send a message…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    maxLength={2000}
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            )}

            {sidePanel === 'people' && (
              <div className="people-panel">
                {/* ── Add people section ── */}
                <div className="add-people-section">
                  <button className="add-people-btn" onClick={() => setShowInviteModal(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Add people
                  </button>
                </div>
                <div className="people-invite-box">
                  <div className="invite-link-row">
                    <span className="invite-link-text">{window.location.origin}?room={roomId}</span>
                    <button className="invite-copy-btn" onClick={copyLink} title="Copy link">
                      {copied ? '✓' : '📋'}
                    </button>
                  </div>
                  <div className="invite-email-row">
                    <input
                      type="email"
                      className="invite-email-input"
                      placeholder="Enter email to invite"
                      value={inviteEmail}
                      onChange={e => { setInviteEmail(e.target.value); setInviteError(''); }}
                      onKeyDown={e => e.key === 'Enter' && sendEmailInvite()}
                    />
                    <button
                      className="invite-send-btn"
                      onClick={sendEmailInvite}
                      disabled={!inviteEmail.trim() || inviteStatus === 'sending'}
                    >
                      {inviteStatus === 'sending' ? '⏳' : inviteStatus === 'sent' ? '✓ Sent' : '📧 Send'}
                    </button>
                  </div>
                  {inviteError && <p className="invite-error">{inviteError}</p>}
                </div>

                <div className="people-section-label">IN THE MEETING</div>
                <div className="person-row">
                  <div className="avatar-circle sm">{userName.charAt(0).toUpperCase()}</div>
                  <span className="person-name">{userName} (You){amHost ? ' 👑' : ''}</span>
                  <span className="person-icons">
                    {!audioEnabled && '🔇'}{!videoEnabled && '📷'}{handRaised && '✋'}
                  </span>
                </div>
                {Array.from(participants.values()).map(p => (
                  <div key={p.sid} className="person-row">
                    <div className="avatar-circle sm">{p.name.charAt(0).toUpperCase()}</div>
                    <span className="person-name">{p.name}</span>
                    <span className="person-icons">
                      {!p.audioEnabled && '🔇'}{!p.videoEnabled && '📷'}{p.handRaised && '✋'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sidePanel === 'transcript' && (
              <div className="transcript-panel">
                <div className="transcript-messages">
                  {transcripts.length === 0 && (
                    <p className="chat-empty">No transcripts yet. Enable captions (CC) to start capturing.</p>
                  )}
                  {transcripts.map(t => (
                    <div key={t.id} className="transcript-line">
                      <span className="transcript-speaker">{t.speaker}</span>
                      <p className="transcript-text">{t.text}</p>
                      {t.confidence < 0.7 && <span className="transcript-low-conf">⚠ low confidence</span>}
                    </div>
                  ))}
                  <div ref={transcriptEnd} />
                </div>
                {painAlerts.length > 0 && (
                  <div className="pain-alerts">
                    {painAlerts.map(a => (
                      <div key={a.id} className="pain-alert">
                        🚨 <strong>Pain point detected:</strong> {a.text.slice(0, 80)}…
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- AI processing indicator ---- */}
      {aiProcessing && (
        <div className="ai-processing-overlay">
          <span className="ai-spinner" />
          <span>AI is analysing the meeting…</span>
        </div>
      )}

      {/* ---- pain-point toast alerts ---- */}
      {sidePanel !== 'transcript' && painAlerts.length > 0 && (
        <div className="pain-toast-container">
          {painAlerts.map(a => (
            <div key={a.id} className="pain-toast">
              🚨 Pain point detected
            </div>
          ))}
        </div>
      )}

      {/* ---- captions overlay ---- */}
      {captionsOn && captions.size > 0 && (
        <div className="captions-overlay">
          {Array.from(captions.entries()).map(([sid, c]) => (
            <div key={sid} className="caption-line">
              <strong>{c.name}:</strong> {c.text}
            </div>
          ))}
        </div>
      )}

      {/* ---- floating reactions ---- */}
      {reactions.map(r => (
        <div key={r.id} className="floating-reaction"><span>{r.emoji}</span></div>
      ))}

      {/* ---- email invite modal ---- */}
      {showInviteModal && (
        <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={e => e.stopPropagation()}>
            <div className="invite-modal-header">
              <h3>Add people</h3>
              <button className="invite-modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <div className="invite-modal-body">
              <div className="invite-modal-input-row">
                <input
                  type="email"
                  className="invite-modal-email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(''); setInviteStatus('idle'); }}
                  onKeyDown={e => e.key === 'Enter' && sendEmailInvite()}
                  autoFocus
                />
                <button
                  className="invite-modal-send"
                  onClick={sendEmailInvite}
                  disabled={!inviteEmail.trim() || inviteStatus === 'sending'}
                >
                  {inviteStatus === 'sending' ? 'Sending…' : 'Send invite'}
                </button>
              </div>
              {inviteStatus === 'sent' && <p className="invite-success">✓ Invitation sent successfully!</p>}
              {inviteError && <p className="invite-error">{inviteError}</p>}
            </div>
            <div className="invite-modal-footer">
              <div className="invite-modal-link-section">
                <span className="invite-modal-link-label">Or share this link</span>
                <div className="invite-modal-link-row">
                  <span className="invite-modal-link">{window.location.origin}?room={roomId}</span>
                  <button className="invite-modal-copy" onClick={copyLink}>
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- emoji picker ---- */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {['👍', '❤️', '😂', '😮', '🎉', '👏'].map(e => (
            <button key={e} onClick={() => sendReaction(e)}>{e}</button>
          ))}
        </div>
      )}

      {/* ---- toolbar ---- */}
      <div className="meeting-toolbar">
        <div className="tb-left"><span className="tb-time">{fmt(elapsed)}</span></div>

        <div className="tb-center">
          <button className={`tb-btn${!audioEnabled ? ' off' : ''}`} onClick={toggleAudio} title={audioEnabled ? 'Mute' : 'Unmute'}>
            {audioEnabled
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.93V21h2v-3.07A7 7 0 0019 11h-2z"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23A6.93 6.93 0 0019 11zM14.98 11.17c0-.06.02-.11.02-.17V5a3 3 0 00-6 0v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11a3 3 0 004.73 2.45l1.57 1.57A6.93 6.93 0 0112 16c-3.87 0-7-3.13-7-5H3c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 23 21 21.73 4.27 3z"/></svg>}
          </button>

          <button className={`tb-btn${!videoEnabled ? ' off' : ''}`} onClick={toggleVideo} title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}>
            {videoEnabled
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>}
          </button>

          <button className={`tb-btn${screenSharing ? ' active' : ''}`} onClick={toggleScreenShare} title="Present now">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
          </button>

          <button className={`tb-btn${showEmojiPicker ? ' active' : ''}`} onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Reactions">
            😊
          </button>

          <button className={`tb-btn${handRaised ? ' active' : ''}`} onClick={toggleHand} title="Raise hand">
            ✋
          </button>

          <button className={`tb-btn cc-btn${captionsOn ? ' active' : ''}`} onClick={toggleCaptions} title="Captions">
            CC
          </button>

          <button className={`tb-btn${recording ? ' rec' : ''}`} onClick={toggleRecording} title={recording ? 'Stop recording' : 'Record'}>
            {recording
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>}
          </button>

          <button
            className={`tb-btn${sidePanel === 'chat' ? ' active' : ''}`}
            onClick={() => { setSidePanel(sidePanel === 'chat' ? 'none' : 'chat'); setUnread(0); }}
            title="Chat"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            {unread > 0 && sidePanel !== 'chat' && <span className="badge">{unread}</span>}
          </button>

          <button
            className={`tb-btn${sidePanel === 'transcript' ? ' active' : ''}`}
            onClick={() => setSidePanel(sidePanel === 'transcript' ? 'none' : 'transcript')}
            title="Live Transcript"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7H7v-2h8v2zm0 4H7v-2h8v2zm-2-8H7V7h6v2z"/></svg>
            {transcripts.length > 0 && <span className="badge">{transcripts.length}</span>}
          </button>

          <button
            className={`tb-btn${sidePanel === 'people' ? ' active' : ''}`}
            onClick={() => setSidePanel(sidePanel === 'people' ? 'none' : 'people')}
            title="People"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05A4.36 4.36 0 0118 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            <span className="badge">{total}</span>
          </button>

          <button className="tb-btn leave-btn" onClick={leave} title="Leave call">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.36C3.69 8.68 7.62 7 12 7s8.31 1.68 11.71 4.72c.38.37.38.98 0 1.36l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.993.993 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
          </button>

          {amHost && (
            <button
              className={`tb-btn waiting-tb-btn${sidePanel === 'waiting' ? ' active' : ''}${waitingCount > 0 ? ' has-waiting' : ''}`}
              onClick={() => setSidePanel(sidePanel === 'waiting' ? 'none' : 'waiting')}
              title="Waiting Room"
            >
              ⏳
              {waitingCount > 0 && <span className="badge waiting-count-badge">{waitingCount}</span>}
            </button>
          )}
        </div>

        <div className="tb-right" />
      </div>
    </div>
  );
}
