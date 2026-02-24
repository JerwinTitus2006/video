import { apiClient } from './api';
import type { 
  DashboardStats,
  PersonAnalytics,
  MeetingAnalytics,
  PainPointFrequency,
  SentimentTrend,
  ResolutionMetrics,
  PerformanceTrend
} from '@/types';

export class AnalyticsService {
  // Get dashboard overview stats
  static async getDashboardStats(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<DashboardStats>(`/analytics/dashboard?${params}`);
  }

  // Get person analytics
  static async getPersonAnalytics(
    personId: string, 
    dateFrom?: string, 
    dateTo?: string
  ) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<PersonAnalytics>(`/analytics/persons/${personId}?${params}`);
  }

  // Get meeting analytics
  static async getMeetingAnalytics(meetingId: string) {
    return apiClient.get<MeetingAnalytics>(`/analytics/meetings/${meetingId}`);
  }

  // Get pain point frequency analysis
  static async getPainPointFrequency(
    period: 'week' | 'month' | 'quarter' = 'month',
    groupBy: 'category' | 'severity' | 'speaker' = 'category',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({
      period,
      group_by: groupBy,
    });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<PainPointFrequency[]>(`/analytics/pain-points/frequency?${params}`);
  }

  // Get sentiment trends
  static async getSentimentTrends(
    period: 'day' | 'week' | 'month' = 'week',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<SentimentTrend[]>(`/analytics/sentiment/trends?${params}`);
  }

  // Get resolution metrics
  static async getResolutionMetrics(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<ResolutionMetrics>(`/analytics/resolution?${params}`);
  }

  // Get performance trends
  static async getPerformanceTrends(
    period: 'week' | 'month' | 'quarter' = 'month',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<PerformanceTrend[]>(`/analytics/performance?${params}`);
  }

  // Get top pain points
  static async getTopPainPoints(
    limit: number = 10,
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/pain-points/top?${params}`);
  }

  // Get sentiment distribution
  static async getSentimentDistribution(
    groupBy: 'meeting' | 'person' | 'period' = 'meeting',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ group_by: groupBy });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/sentiment/distribution?${params}`);
  }

  // Get action item analytics
  static async getActionItemAnalytics(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/action-items?${params}`);
  }

  // Get meeting volume trends
  static async getMeetingVolumetrends(
    period: 'day' | 'week' | 'month' = 'week',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/meetings/volume?${params}`);
  }

  // Get resource usage analytics
  static async getResourceUsage(
    period: 'week' | 'month' | 'quarter' = 'month',
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/resources/usage?${params}`);
  }

  // Get comparative analysis between periods
  static async getComparativeAnalysis(
    currentStart: string,
    currentEnd: string,
    compareStart: string,
    compareEnd: string
  ) {
    const params = new URLSearchParams({
      current_start: currentStart,
      current_end: currentEnd,
      compare_start: compareStart,
      compare_end: compareEnd,
    });
    
    return apiClient.get(`/analytics/compare?${params}`);
  }

  // Export analytics report
  static async exportAnalyticsReport(
    type: 'summary' | 'detailed' | 'pain_points' | 'sentiment' | 'performance',
    format: 'pdf' | 'xlsx' = 'pdf',
    dateFrom?: string,
    dateTo?: string,
    filters?: any
  ) {
    const params = new URLSearchParams({
      type,
      format,
    });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get(`/analytics/export?${params}`, {
      responseType: 'blob',
    });
  }

  // Get real-time analytics updates
  static getRealTimeAnalyticsUrl() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${wsProtocol}//${wsHost}/analytics/live`;
  }

  // Schedule analytics report
  static async scheduleReport(config: {
    type: string;
    format: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    filters?: any;
  }) {
    return apiClient.post('/analytics/schedule', config);
  }
}

export default AnalyticsService;