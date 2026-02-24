import React from 'react';

// Authentication types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'vendor' | 'distributor' | 'user';
  avatar?: string;
  company?: string;
  permissions: string[];
  preferences: UserPreferences;
  last_login?: string;
  created_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  dashboard_layout?: any;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  meeting_reminders: boolean;
  pain_point_alerts: boolean;
  action_item_due: boolean;
  weekly_reports: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// UI Component types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export interface ToastType {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface TableColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: boolean;
  sorting?: boolean;
  filtering?: boolean;
  selection?: boolean;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string | number }[];
  validation?: any; // Zod schema
  description?: string;
  defaultValue?: any;
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  path?: string;
  children?: NavItem[];
  badge?: string | number;
  external?: boolean;
  permissions?: string[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  current?: boolean;
}

// Theme types
export interface ThemeConfig {
  colors: {
    primary: string;
    accent: string;
    secondary: string;
    neutral: string;
  };
  fonts: {
    sans: string;
    display: string;
  };
  borderRadius: string;
  shadows: {
    soft: string;
    glass: string;
    glow: string;
  };
}

// Status types
export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

// WebSocket types
export interface WebSocketMessage {
  type: 'meeting_update' | 'pain_point_detected' | 'sentiment_update' | 'transcription' | 'speaker_change';
  data: any;
  timestamp: string;
  meeting_id?: string;
}

// Real-time updates
export interface RealTimeUpdate {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    path: string;
  };
}

// Search types
export interface SearchResult {
  id: string;
  type: 'meeting' | 'person' | 'pain_point' | 'resource' | 'action_item';
  title: string;
  subtitle?: string;
  description?: string;
  path: string;
  score?: number;
  highlight?: string[];
}

export interface SearchFilters {
  type?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  categories?: string[];
  status?: string[];
}

// File upload types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

// Jitsi integration types
export interface JitsiConfig {
  roomName: string;
  width?: string | number;
  height?: string | number;
  parentNode?: HTMLElement;
  configOverwrite?: any;
  interfaceConfigOverwrite?: any;
  jwt?: string;
  onAPILoad?: (api: any) => void;
  getIFrameRef?: (ref: HTMLIFrameElement) => void;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}