// ── REST helpers for AI Call Intelligence Platform ──
const API = '';

// ── Room management ──

export async function createRoom(): Promise<{ roomId: string; meetingId?: string }> {
  const res = await fetch(`${API}/api/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; rooms: number }> {
  const res = await fetch(`${API}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

// ── Meeting analytics ──

export interface MeetingSummary {
  id: string;
  room_code: string;
  title: string;
  host_name?: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  participant_count: number;
  duration_minutes: number | null;
  has_recording?: boolean;
}

export interface TranscriptLine {
  id: string;
  speaker_name: string;
  text: string;
  timestamp_seconds: number;
  confidence: number;
  created_at: string;
}

export interface PainPointData {
  id: string;
  issue_text: string;
  category: string;
  severity: string;
  status: string;
  extracted_at: string;
  solutions: {
    id: string;
    solution_text: string;
    implementation_steps: string[];
    feasibility_score: number | null;
    estimated_impact: string;
  }[];
}

export interface ActionItemData {
  id: string;
  task_description: string;
  assigned_to: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface SentimentData {
  overall_sentiment: string;
  sentiment_score: number;
  distributor_satisfaction: number;
  confidence: number;
  analyzed_at: string;
}

export async function listMeetings(status?: string): Promise<{ meetings: MeetingSummary[] }> {
  const url = status ? `${API}/api/meetings?status=${status}` : `${API}/api/meetings`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to list meetings');
  return res.json();
}

export async function getMeeting(meetingId: string): Promise<MeetingSummary> {
  const res = await fetch(`${API}/api/meetings/${meetingId}`);
  if (!res.ok) throw new Error('Failed to get meeting');
  return res.json();
}

export async function getTranscripts(meetingId: string): Promise<{ transcripts: TranscriptLine[] }> {
  const res = await fetch(`${API}/api/meetings/${meetingId}/transcripts`);
  if (!res.ok) throw new Error('Failed to get transcripts');
  return res.json();
}

export async function getPainPoints(meetingId: string): Promise<{ pain_points: PainPointData[] }> {
  const res = await fetch(`${API}/api/meetings/${meetingId}/pain-points`);
  if (!res.ok) throw new Error('Failed to get pain points');
  return res.json();
}

export async function getActionItems(meetingId: string): Promise<{ action_items: ActionItemData[] }> {
  const res = await fetch(`${API}/api/meetings/${meetingId}/action-items`);
  if (!res.ok) throw new Error('Failed to get action items');
  return res.json();
}

export async function getSentiment(meetingId: string): Promise<SentimentData> {
  const res = await fetch(`${API}/api/meetings/${meetingId}/sentiment`);
  if (!res.ok) throw new Error('Failed to get sentiment');
  return res.json();
}

