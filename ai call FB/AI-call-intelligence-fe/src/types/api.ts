// Core data types based on backend API models

export interface Meeting {
  id: string;
  jitsi_room_id?: string;
  title: string;
  recording_url?: string;
  audio_path?: string;
  transcript?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  participants?: Person[];
  pain_points?: PainPoint[];
  action_items?: ActionItem[];
  sentiment_segments?: SentimentSegment[];
}

export interface Person {
  id: string;
  name: string;
  role: 'vendor' | 'distributor' | 'admin';
  email?: string;
  phone?: string;
  company?: string;
  voice_embedding?: number[];
  created_at: string;
  updated_at: string;
  meetings?: Meeting[];
  health_score?: number;
  pain_point_count?: number;
  resolution_rate?: number;
}

export interface PainPoint {
  id: string;
  meeting_id: string;
  text: string;
  label: string;
  speaker?: string;
  start_time?: number;
  end_time?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  status: 'identified' | 'in_review' | 'resolved' | 'escalated';
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  meeting?: Meeting;
  action_items?: ActionItem[];
  matched_resources?: Resource[];
  embedding?: number[];
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  pain_point_id?: string;
  owner?: string;
  description: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  meeting?: Meeting;
  pain_point?: PainPoint;
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'contact' | 'tool' | 'process';
  content?: string;
  file_path?: string;
  url?: string;
  tags: string[];
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  embedding?: number[];
  matched_pain_points?: PainPoint[];
}

export interface SentimentSegment {
  id: string;
  meeting_id: string;
  speaker?: string;
  text: string;
  sentiment_score: number; // -1 to 1
  sentiment_label: 'positive' | 'neutral' | 'negative';
  start_time: number;
  end_time: number;
  created_at: string;
  meeting?: Meeting;
}

export interface Report {
  id: string;
  meeting_id?: string;
  title: string;
  type: 'meeting_summary' | 'pain_point_analysis' | 'sentiment_report' | 'action_summary' | 'performance';
  content: any; // JSON content
  generated_at: string;
  file_path?: string;
  status: 'generating' | 'completed' | 'failed';
  created_by?: string;
  meeting?: Meeting;
}

// API Response types
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: 'success' | 'error';
}

// Form data types
export interface MeetingCreateData {
  title: string;
  jitsi_room_id?: string;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  participant_ids?: string[];
}

export interface PersonCreateData {
  name: string;
  role: 'vendor' | 'distributor' | 'admin';
  email?: string;
  phone?: string;
  company?: string;
}

export interface ActionItemCreateData {
  meeting_id: string;
  pain_point_id?: string;
  owner?: string;
  description: string;
  due_date?: string;
}

export interface ResourceCreateData {
  title: string;
  type: 'document' | 'video' | 'link' | 'contact' | 'tool' | 'process';
  content?: string;
  file_path?: string;
  url?: string;
  tags: string[];
  category?: string;
  description?: string;
}

// Filter and search types
export interface MeetingFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  participant_id?: string;
  search?: string;
}

export interface PainPointFilters {
  severity?: string;
  status?: string;
  category?: string;
  meeting_id?: string;
  speaker?: string;
  search?: string;
}

export interface ActionItemFilters {
  status?: string;
  owner?: string;
  due_date_from?: string;
  due_date_to?: string;
  meeting_id?: string;
  search?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  size: number;
}

// Sort options
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}
// ── Jitsi Meeting Integration ───────────────────────────────────────────────

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
