import { apiClient } from './api';
import type { 
  Meeting, 
  MeetingCreateData, 
  MeetingFilters, 
  ListResponse, 
  PaginationParams 
} from '@/types';

export class MeetingService {
  // Get all meetings with filtering and pagination
  static async getMeetings(
    pagination: PaginationParams = { page: 1, size: 20 },
    filters: MeetingFilters = {}
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return apiClient.get<ListResponse<Meeting>>(`/meetings?${params}`);
  }

  // Get single meeting by ID
  static async getMeeting(id: string) {
    return apiClient.get<Meeting>(`/meetings/${id}`);
  }

  // Create new meeting
  static async createMeeting(data: MeetingCreateData) {
    return apiClient.post<Meeting>('/meetings', data);
  }

  // Update meeting
  static async updateMeeting(id: string, data: Partial<MeetingCreateData>) {
    return apiClient.patch<Meeting>(`/meetings/${id}`, data);
  }

  // Delete meeting
  static async deleteMeeting(id: string) {
    return apiClient.delete(`/meetings/${id}`);
  }

  // Join participants to meeting
  static async joinParticipant(meetingId: string, personId: string) {
    return apiClient.post(`/meetings/${meetingId}/participants/${personId}`);
  }

  // Remove participant from meeting
  static async removeParticipant(meetingId: string, personId: string) {
    return apiClient.delete(`/meetings/${meetingId}/participants/${personId}`);
  }

  // Get meeting analytics
  static async getMeetingAnalytics(id: string) {
    return apiClient.get(`/analytics/meetings/${id}`);
  }

  // Export meeting data
  static async exportMeeting(id: string, format: 'pdf' | 'csv' = 'pdf') {
    return apiClient.get(`/meetings/${id}/export?format=${format}`, {
      responseType: 'blob',
    });
  }

  // Start recording
  static async startRecording(id: string) {
    return apiClient.post(`/meetings/${id}/recording/start`);
  }

  // Stop recording
  static async stopRecording(id: string) {
    return apiClient.post(`/meetings/${id}/recording/stop`);
  }

  // Get meeting transcript
  static async getTranscript(id: string) {
    return apiClient.get(`/meetings/${id}/transcript`);
  }

  // ── Jitsi Meeting Integration ────────────────────────────────────────────
  
  // Start a Jitsi meeting (returns room URL)
  static async startJitsiMeeting(id: string) {
    return apiClient.post(`/meetings/${id}/start`);
  }

  // Join a Jitsi meeting (returns room URL)
  static async joinJitsiMeeting(id: string) {
    return apiClient.post(`/meetings/${id}/join`);
  }

  // Get Jitsi room info for a meeting
  static async getJitsiInfo(id: string) {
    return apiClient.get(`/meetings/${id}/jitsi`);
  }

  // Quick start a new meeting (creates + starts in one call)
  static async quickStartMeeting(title: string = 'Quick Meeting') {
    return apiClient.post('/meetings/quick-start', { title });
  }

  // Upload meeting audio
  static async uploadAudio(id: string, file: File, onProgress?: (progress: number) => void) {
    return apiClient.uploadFile(`/meetings/${id}/upload-audio`, file, onProgress);
  }

  // Get live meeting updates via WebSocket connection info
  static getLiveMeetingUrl(id: string) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${wsProtocol}//${wsHost}/live/${id}`;
  }
}

export default MeetingService;