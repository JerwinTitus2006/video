import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  DashboardStats, 
  PainPointFrequency, 
  SentimentTrend,
  PerformanceTrend 
} from '@/types';

interface AnalyticsState {
  // Dashboard data
  dashboardStats: DashboardStats | null;
  painPointFrequency: PainPointFrequency[];
  sentimentTrends: SentimentTrend[];
  performanceTrends: PerformanceTrend[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Date range for analytics
  dateRange: {
    start: string;
    end: string;
  };
  
  // Chart configurations
  chartConfigs: Record<string, any>;
  
  // Real-time updates
  realTimeEnabled: boolean;
  lastUpdated: string | null;
}

interface AnalyticsActions {
  // Data actions
  setDashboardStats: (stats: DashboardStats | null) => void;
  setPainPointFrequency: (data: PainPointFrequency[]) => void;
  setSentimentTrends: (data: SentimentTrend[]) => void;
  setPerformanceTrends: (data: PerformanceTrend[]) => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Date range
  setDateRange: (start: string, end: string) => void;
  resetDateRange: () => void;
  
  // Chart configurations
  updateChartConfig: (chartId: string, config: any) => void;
  resetChartConfigs: () => void;
  
  // Real-time updates
  setRealTimeEnabled: (enabled: boolean) => void;
  updateLastUpdated: () => void;
  
  // Reset all data
  resetAnalytics: () => void;
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30); // Last 30 days
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

const initialState: AnalyticsState = {
  // Dashboard data
  dashboardStats: null,
  painPointFrequency: [],
  sentimentTrends: [],
  performanceTrends: [],
  
  // UI state
  isLoading: false,
  error: null,
  
  // Date range
  dateRange: getDefaultDateRange(),
  
  // Chart configurations
  chartConfigs: {},
  
  // Real-time updates
  realTimeEnabled: false,
  lastUpdated: null,
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Data actions
      setDashboardStats: (dashboardStats: DashboardStats | null) => {
        set({ dashboardStats, error: null }, false, 'analytics/setDashboardStats');
      },

      setPainPointFrequency: (painPointFrequency: PainPointFrequency[]) => {
        set({ painPointFrequency }, false, 'analytics/setPainPointFrequency');
      },

      setSentimentTrends: (sentimentTrends: SentimentTrend[]) => {
        set({ sentimentTrends }, false, 'analytics/setSentimentTrends');
      },

      setPerformanceTrends: (performanceTrends: PerformanceTrend[]) => {
        set({ performanceTrends }, false, 'analytics/setPerformanceTrends');
      },

      // UI actions
      setLoading: (isLoading: boolean) => {
        set({ isLoading }, false, 'analytics/setLoading');
      },

      setError: (error: string | null) => {
        set({ error }, false, 'analytics/setError');
      },

      // Date range actions
      setDateRange: (start: string, end: string) => {
        set({ dateRange: { start, end } }, false, 'analytics/setDateRange');
      },

      resetDateRange: () => {
        set({ dateRange: getDefaultDateRange() }, false, 'analytics/resetDateRange');
      },

      // Chart configuration actions
      updateChartConfig: (chartId: string, config: any) => {
        const { chartConfigs } = get();
        set(
          { chartConfigs: { ...chartConfigs, [chartId]: config } },
          false,
          'analytics/updateChartConfig'
        );
      },

      resetChartConfigs: () => {
        set({ chartConfigs: {} }, false, 'analytics/resetChartConfigs');
      },

      // Real-time actions
      setRealTimeEnabled: (realTimeEnabled: boolean) => {
        set({ realTimeEnabled }, false, 'analytics/setRealTimeEnabled');
      },

      updateLastUpdated: () => {
        set({ lastUpdated: new Date().toISOString() }, false, 'analytics/updateLastUpdated');
      },

      // Reset all data
      resetAnalytics: () => {
        set(
          {
            dashboardStats: null,
            painPointFrequency: [],
            sentimentTrends: [],
            performanceTrends: [],
            error: null,
            chartConfigs: {},
            lastUpdated: null,
          },
          false,
          'analytics/resetAnalytics'
        );
      },
    }),
    {
      name: 'analytics-store',
    }
  )
);