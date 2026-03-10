import { useState, useEffect } from 'react';
import { listMeetings, type MeetingSummary } from './api';

interface Props {
  onBack: () => void;
  onViewMeeting: (meetingId: string) => void;
}

export default function AnalyticsDashboard({ onBack, onViewMeeting }: Props) {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'ended' | 'waiting'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listMeetings(filter === 'all' ? undefined : filter);
        if (!cancelled) {
          setMeetings(data.meetings || []);
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to load meetings', e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  const totalMinutes = meetings.reduce((s, m) => s + (m.duration_minutes ?? 0), 0);
  const totalParticipants = meetings.reduce((s, m) => s + m.participant_count, 0);
  const liveMeetings = meetings.filter(m => m.status === 'live').length;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <button className="summary-back" onClick={onBack}>← Back</button>
        <h1>📊 Analytics Dashboard</h1>
      </header>

      {/* ── Stats row ── */}
      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-icon">📹</span>
          <div>
            <div className="stat-value">{meetings.length}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-value">{liveMeetings}</div>
            <div className="stat-label">Live Now</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <div>
            <div className="stat-value">{totalMinutes} min</div>
            <div className="stat-label">Total Duration</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <div className="stat-value">{totalParticipants}</div>
            <div className="stat-label">Total Participants</div>
          </div>
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="dash-filter-row">
        {(['all', 'live', 'ended', 'waiting'] as const).map(f => (
          <button
            key={f}
            className={`summary-tab${filter === f ? ' active' : ''}`}
            onClick={() => { setFilter(f); setLoading(true); }}
          >
            {f === 'all' ? 'All' : f === 'live' ? '🟢 Live' : f === 'ended' ? '🏁 Ended' : '⏳ Waiting'}
          </button>
        ))}
      </div>

      {/* ── Meeting list ── */}
      {loading ? (
        <div className="summary-loading">
          <span className="ai-spinner" />
          <p>Loading…</p>
        </div>
      ) : (
        <div className="meetings-table">
          {meetings.length === 0 && <p className="empty-msg">No meetings found.</p>}
          {meetings.map(m => (
            <div
              key={m.id}
              className="meeting-row-card"
              onClick={() => m.status === 'ended' && onViewMeeting(m.id)}
              style={{ cursor: m.status === 'ended' ? 'pointer' : 'default' }}
            >
              <div className="mrc-left">
                <span className={`mrc-status ${m.status}`}>
                  {m.status === 'live' ? '🟢 Live'
                    : m.status === 'waiting' ? '⏳ Waiting'
                    : m.status === 'scheduled' ? '📅 Scheduled'
                    : '🏁 Ended'}
                </span>
                <div>
                  <p className="mrc-title">{m.title || m.room_code}</p>
                  <p className="mrc-meta">
                    {m.started_at ? new Date(m.started_at).toLocaleString() : ''}
                    {m.duration_minutes != null && ` · ${m.duration_minutes} min`}
                  </p>
                </div>
              </div>
              <div className="mrc-right">
                <span className="mrc-participants">👥 {m.participant_count}</span>
                {m.has_recording && (
                  <button
                    className="mrc-recording-btn"
                    title="Play recording"
                    onClick={e => {
                      e.stopPropagation();
                      window.open(`/api/meetings/${m.id}/recording`, '_blank');
                    }}
                  >
                    🎬 Recording
                  </button>
                )}
                {m.status === 'ended' && (
                  <button className="mrc-view-btn" onClick={e => { e.stopPropagation(); onViewMeeting(m.id); }}>
                    View Insights →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
