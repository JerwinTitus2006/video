import { useState, useEffect, useRef } from 'react';
import {
  getMeeting, getTranscripts, getPainPoints, getActionItems, getSentiment,
  type MeetingSummary as MeetingData, type TranscriptLine,
  type PainPointData, type ActionItemData, type SentimentData,
} from './api';

interface Props {
  meetingId: string;
  onBack: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ea4335',
  high: '#fa7b17',
  medium: '#fbbc04',
  low: '#34a853',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ea4335',
  high: '#fa7b17',
  medium: '#fbbc04',
  low: '#34a853',
};

/* ── Recording player with availability check ── */
function RecordingPlayer({ meetingId }: { meetingId: string }) {
  const [status, setStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/recording`, { method: 'HEAD' });
        if (cancelled) return;
        if (res.ok) {
          // Recording exists – fetch it as blob for reliable playback
          const dataRes = await fetch(`/api/meetings/${meetingId}/recording`);
          if (cancelled) return;
          if (dataRes.ok) {
            const blob = await dataRes.blob();
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            setStatus('available');
          } else {
            setStatus('unavailable');
          }
        } else {
          setStatus('unavailable');
        }
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [meetingId]);

  if (status === 'loading') {
    return (
      <div className="recording-view" style={{ textAlign: 'center', padding: '40px' }}>
        <span className="ai-spinner" />
        <p>Loading recording…</p>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="recording-view" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '3rem', marginBottom: '12px' }}>🎬</p>
        <p style={{ color: '#5f6368' }}>No recording available for this meeting.</p>
      </div>
    );
  }

  return (
    <div className="recording-view">
      <video
        ref={videoRef}
        controls
        style={{ width: '100%', maxHeight: '500px', borderRadius: '8px', background: '#000' }}
        src={blobUrl || undefined}
      >
        Your browser does not support video playback.
      </video>
      <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
        <a
          href={`/api/meetings/${meetingId}/recording`}
          download={`meeting-${meetingId}.webm`}
          className="mrc-view-btn"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          ⬇️ Download Recording
        </a>
      </div>
    </div>
  );
}

export default function MeetingSummary({ meetingId, onBack }: Props) {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [painPoints, setPainPoints] = useState<PainPointData[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemData[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [tab, setTab] = useState<'recording' | 'transcript' | 'painpoints' | 'actions' | 'sentiment'>('recording');
  const [loading, setLoading] = useState(true);
  const [expandedPP, setExpandedPP] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, t, pp, ai, s] = await Promise.all([
          getMeeting(meetingId),
          getTranscripts(meetingId),
          getPainPoints(meetingId),
          getActionItems(meetingId),
          getSentiment(meetingId).catch(() => null),
        ]);
        if (cancelled) return;
        setMeeting(m);
        setTranscripts(t.transcripts || []);
        setPainPoints(pp.pain_points || []);
        setActionItems(ai.action_items || []);
        // Backend returns { error: "..." } when sentiment isn't ready
        setSentiment(s && !('error' in (s as any)) ? s : null);
      } catch (e) {
        console.error('Failed to load meeting data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [meetingId]);

  if (loading) {
    return (
      <div className="summary-page">
        <div className="summary-loading">
          <span className="ai-spinner" />
          <p>Loading meeting insights…</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="summary-page">
        <p>Meeting not found.</p>
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
    );
  }

  const sentimentEmoji = sentiment
    ? sentiment.overall_sentiment === 'positive' ? '😊'
      : sentiment.overall_sentiment === 'negative' ? '😟' : '😐'
    : '—';

  return (
    <div className="summary-page">
      {/* ── Header ── */}
      <header className="summary-header">
        <button className="summary-back" onClick={onBack}>← Back</button>
        <div>
          <h1 className="summary-title">{meeting.title || 'Meeting Summary'}</h1>
          <p className="summary-meta">
            {meeting.started_at ? new Date(meeting.started_at).toLocaleString() : ''}
            {meeting.duration_minutes != null && ` · ${meeting.duration_minutes} min`}
            {` · ${meeting.participant_count} participant${meeting.participant_count !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* ── Stats cards ── */}
      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <div>
            <div className="stat-value">{transcripts.length}</div>
            <div className="stat-label">Transcripts</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔍</span>
          <div>
            <div className="stat-value">{painPoints.length}</div>
            <div className="stat-label">Pain Points</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-value">{actionItems.length}</div>
            <div className="stat-label">Action Items</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">{sentimentEmoji}</span>
          <div>
            <div className="stat-value">{sentiment ? `${sentiment.sentiment_score}%` : '—'}</div>
            <div className="stat-label">Sentiment</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="summary-tabs">
        {(['recording', 'transcript', 'painpoints', 'actions', 'sentiment'] as const).map(t => (
          <button
            key={t}
            className={`summary-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'recording' ? '🎬 Recording'
              : t === 'transcript' ? '📝 Transcript'
              : t === 'painpoints' ? '🔍 Pain Points'
              : t === 'actions' ? '✅ Actions'
              : '📊 Sentiment'}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="summary-content">

        {/* RECORDING */}
        {tab === 'recording' && (
          <RecordingPlayer meetingId={meetingId} />
        )}

        {/* TRANSCRIPT */}
        {tab === 'transcript' && (
          <div className="transcript-list">
            {transcripts.length === 0 && <p className="empty-msg">No transcripts captured for this meeting.</p>}
            {transcripts.map(t => (
              <div key={t.id} className="summary-transcript-line">
                <span className="stl-speaker">{t.speaker_name}</span>
                <span className="stl-text">{t.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* PAIN POINTS */}
        {tab === 'painpoints' && (
          <div className="painpoints-list">
            {painPoints.length === 0 && <p className="empty-msg">No pain points detected.</p>}
            {painPoints.map(pp => (
              <div key={pp.id} className="pp-card" onClick={() => setExpandedPP(expandedPP === pp.id ? null : pp.id)}>
                <div className="pp-header">
                  <span className="pp-severity" style={{ background: SEVERITY_COLORS[pp.severity] || '#888' }}>
                    {pp.severity}
                  </span>
                  <span className="pp-category">{pp.category}</span>
                  <span className="pp-status">{pp.status}</span>
                </div>
                <p className="pp-text">{pp.issue_text}</p>

                {expandedPP === pp.id && pp.solutions.length > 0 && (
                  <div className="pp-solutions">
                    <h4>💡 Recommended Solutions</h4>
                    {pp.solutions.map(s => (
                      <div key={s.id} className="solution-card">
                        <p className="sol-text">{s.solution_text}</p>
                        {s.implementation_steps.length > 0 && (
                          <ul className="sol-steps">
                            {s.implementation_steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        )}
                        <div className="sol-meta">
                          <span>Impact: <strong>{s.estimated_impact}</strong></span>
                          {s.feasibility_score != null && <span>Feasibility: <strong>{(s.feasibility_score * 100).toFixed(0)}%</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ACTION ITEMS */}
        {tab === 'actions' && (
          <div className="actions-list">
            {actionItems.length === 0 && <p className="empty-msg">No action items extracted.</p>}
            {actionItems.map(a => (
              <div key={a.id} className="action-card">
                <div className="action-header">
                  <span className="action-priority" style={{ background: PRIORITY_COLORS[a.priority] || '#888' }}>
                    {a.priority}
                  </span>
                  <span className="action-assignee">→ {a.assigned_to}</span>
                  <span className="action-status">{a.status}</span>
                </div>
                <p className="action-text">{a.task_description}</p>
              </div>
            ))}
          </div>
        )}

        {/* SENTIMENT */}
        {tab === 'sentiment' && (
          <div className="sentiment-view">
            {!sentiment && <p className="empty-msg">Sentiment analysis not available yet.</p>}
            {sentiment && (
              <>
                <div className="sentiment-hero">
                  <span className="sentiment-emoji">{sentimentEmoji}</span>
                  <div>
                    <h2 className="sentiment-label">{sentiment.overall_sentiment.toUpperCase()}</h2>
                    <p className="sentiment-score-text">Score: {sentiment.sentiment_score}%</p>
                  </div>
                </div>

                <div className="sentiment-bars">
                  <div className="sbar">
                    <span className="sbar-label">Overall Score</span>
                    <div className="sbar-track">
                      <div
                        className="sbar-fill"
                        style={{
                          width: `${sentiment.sentiment_score}%`,
                          background: sentiment.sentiment_score >= 60 ? '#34a853'
                            : sentiment.sentiment_score >= 40 ? '#fbbc04' : '#ea4335',
                        }}
                      />
                    </div>
                    <span className="sbar-val">{sentiment.sentiment_score}%</span>
                  </div>
                  <div className="sbar">
                    <span className="sbar-label">Satisfaction</span>
                    <div className="sbar-track">
                      <div
                        className="sbar-fill"
                        style={{
                          width: `${sentiment.distributor_satisfaction}%`,
                          background: sentiment.distributor_satisfaction >= 60 ? '#34a853'
                            : sentiment.distributor_satisfaction >= 40 ? '#fbbc04' : '#ea4335',
                        }}
                      />
                    </div>
                    <span className="sbar-val">{sentiment.distributor_satisfaction}%</span>
                  </div>
                  <div className="sbar">
                    <span className="sbar-label">Confidence</span>
                    <div className="sbar-track">
                      <div className="sbar-fill" style={{ width: `${sentiment.confidence * 100}%`, background: '#1a73e8' }} />
                    </div>
                    <span className="sbar-val">{(sentiment.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
