// Analytics and dashboard specific types

export interface DashboardStats {
  total_meetings: number;
  active_meetings: number;
  total_pain_points: number;
  resolved_pain_points: number;
  pending_action_items: number;
  average_sentiment: number;
  health_score: number;
  resolution_rate: number;
}

export interface PainPointFrequency {
  label: string;
  count: number;
  percentage: number;
  category?: string;
  severity?: string;
}

export interface SentimentTrend {
  period: string;
  date: string;
  average_score: number;
  meeting_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
}

export interface PersonAnalytics {
  person_id: string;
  person_name: string;
  total_meetings: number;
  pain_point_frequencies: PainPointFrequency[];
  sentiment_trends: SentimentTrend[];
  resolution_rate: number;
  health_score: number;
  recent_pain_points: any[];
  recent_action_items: any[];
  engagement_score?: number;
  satisfaction_trend?: number[];
}

export interface MeetingAnalytics {
  meeting_id: string;
  title: string;
  average_sentiment: number;
  pain_point_count: number;
  action_item_count: number;
  resolution_rate: number;
  duration_minutes?: number;
  participant_count?: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface TopPainPoint {
  id: string;
  text: string;
  category: string;
  frequency: number;
  severity: string;
  recent_meetings: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ResolutionMetrics {
  total_pain_points: number;
  resolved_count: number;
  pending_count: number;
  escalated_count: number;
  average_resolution_time: number; // in hours
  resolution_rate_by_category: { [key: string]: number };
}

export interface PerformanceTrend {
  period: string;
  metrics: {
    meetings_count: number;
    pain_points_count: number;
    resolution_rate: number;
    satisfaction_score: number;
    response_time: number; // in hours
  };
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  label?: string;
  category?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
  category?: string;
}

export interface BarChartData {
  category: string;
  value: number;
  color?: string;
  subcategories?: { name: string; value: number; color?: string }[];
}

export interface DonutChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// Heatmap data
export interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
  color?: string;
}

// Export configuration
export interface ExportConfig {
  format: 'pdf' | 'csv' | 'xlsx' | 'png';
  filename: string;
  includeCharts?: boolean;
  includeData?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: any;
}