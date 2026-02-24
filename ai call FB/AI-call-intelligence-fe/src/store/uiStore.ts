import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ToastType } from '@/types';

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Layout
  sidebarCollapsed: boolean;
  
  // Modals
  modals: Record<string, boolean>;
  
  // Toasts
  toasts: ToastType[];
  
  // Loading states
  globalLoading: boolean;
  
  // Notifications
  notifications: any[];
  unreadCount: number;
  
  // Search
  searchOpen: boolean;
  searchQuery: string;
  
  // Mobile
  isMobile: boolean;
}

interface UIActions {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  
  // Layout
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Modals
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Toasts
  addToast: (toast: Omit<ToastType, 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
  
  // Global loading
  setGlobalLoading: (loading: boolean) => void;
  
  // Notifications
  setNotifications: (notifications: any[]) => void;
  addNotification: (notification: any) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Search
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Mobile
  setIsMobile: (isMobile: boolean) => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  modals: {},
  toasts: [],
  globalLoading: false,
  notifications: [],
  unreadCount: 0,
  searchOpen: false,
  searchQuery: '',
  isMobile: false,
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Theme actions
        setTheme: (theme: 'light' | 'dark' | 'system') => {
          set({ theme }, false, 'ui/setTheme');
          
          // Apply theme to document
          const root = document.documentElement;
          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
          } else {
            root.classList.toggle('dark', theme === 'dark');
          }
        },

        toggleTheme: () => {
          const { theme } = get();
          const newTheme = theme === 'light' ? 'dark' : 'light';
          get().setTheme(newTheme);
        },

        // Layout actions
        toggleSidebar: () => {
          const { sidebarCollapsed } = get();
          set({ sidebarCollapsed: !sidebarCollapsed }, false, 'ui/toggleSidebar');
        },

        setSidebarCollapsed: (sidebarCollapsed: boolean) => {
          set({ sidebarCollapsed }, false, 'ui/setSidebarCollapsed');
        },

        // Modal actions
        openModal: (modalId: string) => {
          const { modals } = get();
          set(
            { modals: { ...modals, [modalId]: true } },
            false,
            'ui/openModal'
          );
        },

        closeModal: (modalId: string) => {
          const { modals } = get();
          set(
            { modals: { ...modals, [modalId]: false } },
            false,
            'ui/closeModal'
          );
        },

        toggleModal: (modalId: string) => {
          const { modals } = get();
          set(
            { modals: { ...modals, [modalId]: !modals[modalId] } },
            false,
            'ui/toggleModal'
          );
        },

        closeAllModals: () => {
          set({ modals: {} }, false, 'ui/closeAllModals');
        },

        // Toast actions
        addToast: (toastData: Omit<ToastType, 'id'>) => {
          const { toasts } = get();
          const toast: ToastType = {
            ...toastData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          };
          
          set({ toasts: [...toasts, toast] }, false, 'ui/addToast');

          // Auto remove after duration
          if (toast.duration !== 0) {
            setTimeout(() => {
              get().removeToast(toast.id);
            }, toast.duration || 5000);
          }
        },

        removeToast: (toastId: string) => {
          const { toasts } = get();
          set(
            { toasts: toasts.filter((t) => t.id !== toastId) },
            false,
            'ui/removeToast'
          );
        },

        clearToasts: () => {
          set({ toasts: [] }, false, 'ui/clearToasts');
        },

        // Global loading
        setGlobalLoading: (globalLoading: boolean) => {
          set({ globalLoading }, false, 'ui/setGlobalLoading');
        },

        // Notification actions
        setNotifications: (notifications: any[]) => {
          const unreadCount = notifications.filter((n) => !n.read).length;
          set({ notifications, unreadCount }, false, 'ui/setNotifications');
        },

        addNotification: (notification: any) => {
          const { notifications } = get();
          const newNotifications = [notification, ...notifications];
          const unreadCount = newNotifications.filter((n) => !n.read).length;
          set(
            { notifications: newNotifications, unreadCount },
            false,
            'ui/addNotification'
          );
        },

        markNotificationRead: (notificationId: string) => {
          const { notifications } = get();
          const updatedNotifications = notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          const unreadCount = updatedNotifications.filter((n) => !n.read).length;
          set(
            { notifications: updatedNotifications, unreadCount },
            false,
            'ui/markNotificationRead'
          );
        },

        clearNotifications: () => {
          set({ notifications: [], unreadCount: 0 }, false, 'ui/clearNotifications');
        },

        // Search actions
        setSearchOpen: (searchOpen: boolean) => {
          set({ searchOpen }, false, 'ui/setSearchOpen');
        },

        setSearchQuery: (searchQuery: string) => {
          set({ searchQuery }, false, 'ui/setSearchQuery');
        },

        // Mobile actions
        setIsMobile: (isMobile: boolean) => {
          set({ isMobile }, false, 'ui/setIsMobile');
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);