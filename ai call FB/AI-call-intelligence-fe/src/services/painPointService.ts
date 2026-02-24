import { apiClient } from './api';
import type { 
  PainPoint, 
  PainPointFilters,
  ListResponse, 
  PaginationParams 
} from '@/types';

export class PainPointService {
  // Get all pain points with filtering and pagination
  static async getPainPoints(
    pagination: PaginationParams = { page: 1, size: 20 },
    filters: PainPointFilters = {}
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return apiClient.get<ListResponse<PainPoint>>(`/pain_points?${params}`);
  }

  // Get single pain point by ID
  static async getPainPoint(id: string) {
    return apiClient.get<PainPoint>(`/pain_points/${id}`);
  }

  // Update pain point
  static async updatePainPoint(id: string, data: { 
    severity?: string; 
    status?: string; 
    category?: string; 
  }) {
    return apiClient.patch<PainPoint>(`/pain_points/${id}`, data);
  }

  // Delete pain point
  static async deletePainPoint(id: string) {
    return apiClient.delete(`/pain_points/${id}`);
  }

  // Mark pain point as resolved
  static async resolvePainPoint(id: string) {
    return apiClient.post(`/pain_points/${id}/resolve`);
  }

  // Escalate pain point
  static async escalatePainPoint(id: string, reason?: string) {
    return apiClient.post(`/pain_points/${id}/escalate`, { reason });
  }

  // Get pain point analytics
  static async getPainPointAnalytics(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/pain-points?${params}`);
  }

  // Get pain point frequency analysis
  static async getPainPointFrequency(
    period: 'week' | 'month' | 'quarter' = 'month',
    groupBy: 'category' | 'severity' | 'speaker' = 'category'
  ) {
    return apiClient.get(`/analytics/pain-points/frequency?period=${period}&group_by=${groupBy}`);
  }

  // Get trending pain points
  static async getTrendingPainPoints(limit: number = 10) {
    return apiClient.get(`/analytics/pain-points/trending?limit=${limit}`);
  }

  // Get pain points by meeting
  static async getPainPointsByMeeting(
    meetingId: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    return apiClient.get(`/meetings/${meetingId}/pain-points?${params}`);
  }

  // Search pain points by text
  static async searchPainPoints(query: string, filters?: PainPointFilters) {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get<PainPoint[]>(`/pain_points/search?${params}`);
  }

  // Get similar pain points
  static async getSimilarPainPoints(id: string, limit: number = 5) {
    return apiClient.get<PainPoint[]>(`/pain_points/${id}/similar?limit=${limit}`);
  }

  // Bulk update pain points
  static async bulkUpdate(ids: string[], data: { 
    severity?: string; 
    status?: string; 
    category?: string; 
  }) {
    return apiClient.patch('/pain_points/bulk', { ids, ...data });
  }

  // Export pain points
  static async exportPainPoints(
    format: 'csv' | 'xlsx' = 'csv',
    filters?: PainPointFilters
  ) {
    const params = new URLSearchParams({ format });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get(`/pain_points/export?${params}`, {
      responseType: 'blob',
    });
  }

  // Get pain point categories
  static async getCategories() {
    return apiClient.get<string[]>('/pain_points/categories');
  }

  // Get pain point resolution suggestions
  static async getResolutionSuggestions(id: string) {
    return apiClient.get(`/pain_points/${id}/suggestions`);
  }
}

export default PainPointService;