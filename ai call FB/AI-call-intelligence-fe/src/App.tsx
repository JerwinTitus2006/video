import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from '@/store';
import { DashboardLayout, AuthLayout } from '@/components/layouts';
import { LoadingOverlay } from '@/components/ui';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = React.lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const EmailVerificationPage = React.lazy(() => import('@/pages/auth/EmailVerificationPage'));
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const MeetingsPage = React.lazy(() => import('@/pages/meetings/MeetingsPage'));
const MeetingDetailPage = React.lazy(() => import('@/pages/meetings/MeetingDetailPage'));
const LiveMeetingPage = React.lazy(() => import('@/pages/meetings/LiveMeetingPage'));
const PersonsPage = React.lazy(() => import('@/pages/persons/PersonsPage'));
const PersonDetailPage = React.lazy(() => import('@/pages/persons/PersonDetailPage'));
const PainPointsPage = React.lazy(() => import('@/pages/pain-points/PainPointsPage'));
const ActionItemsPage = React.lazy(() => import('@/pages/action-items/ActionItemsPage'));
const ResourcesPage = React.lazy(() => import('@/pages/resources/ResourcesPage'));
const AnalyticsPage = React.lazy(() => import('@/pages/analytics/AnalyticsPage'));
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = React.lazy(() => import('@/pages/settings/SettingsPage'));
const SearchPage = React.lazy(() => import('@/pages/search/SearchPage'));
const NotificationsPage = React.lazy(() => import('@/pages/notifications/NotificationsPage'));

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected route wrapper - BYPASSED FOR DEVELOPMENT
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Bypass authentication check - go directly to dashboard
  return <>{children}</>;
};

// Public route wrapper - BYPASSED FOR DEVELOPMENT
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Bypass authentication redirect - allow access to auth pages
  return <>{children}</>;
};

const App: React.FC = () => {
  const { theme } = useUIStore();

  // Initialize theme on app load
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Detect mobile screen size
  useEffect(() => {
    const { setIsMobile, setSidebarCollapsed } = useUIStore.getState();
    
    const checkMobile = () => {
      const isMobileScreen = window.innerWidth < 768;
      setIsMobile(isMobileScreen);
      
      // Collapse sidebar on mobile by default
      if (isMobileScreen) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <div className="App">
              <React.Suspense fallback={<LoadingOverlay isLoading={true} message="Loading page..." />}>
                <Routes>
              {/* Auth routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route index element={<LoginPage />} />
              </Route>
              
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route index element={<SignupPage />} />
              </Route>
              
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route index element={<ForgotPasswordPage />} />
              </Route>

              <Route
                path="/verify-email"
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route index element={<EmailVerificationPage />} />
              </Route>

              {/* Protected dashboard routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Meetings */}
                <Route path="meetings" element={<MeetingsPage />} />
                <Route path="meetings/:id" element={<MeetingDetailPage />} />
                <Route path="meetings/:id/live" element={<LiveMeetingPage />} />
                
                {/* People */}
                <Route path="persons" element={<PersonsPage />} />
                <Route path="persons/:id" element={<PersonDetailPage />} />
                
                {/* Pain Points */}
                <Route path="pain-points" element={<PainPointsPage />} />
                
                {/* Action Items */}
                <Route path="action-items" element={<ActionItemsPage />} />
                
                {/* Resources */}
                <Route path="resources" element={<ResourcesPage />} />
                
                {/* Analytics */}
                <Route path="analytics" element={<AnalyticsPage />} />
                
                {/* Reports */}
                <Route path="reports" element={<ReportsPage />} />
                
                {/* Search */}
                <Route path="search" element={<SearchPage />} />
                
                {/* Notifications */}
                <Route path="notifications" element={<NotificationsPage />} />
                
                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              </Routes>
            </React.Suspense>
          </div>
        </Router>
      </QueryClientProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;