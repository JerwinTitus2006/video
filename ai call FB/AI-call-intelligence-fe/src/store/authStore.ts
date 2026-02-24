import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';

interface AuthStore extends AuthState {
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  refreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,

        // Actions
        login: (user: User, token: string) => {
          localStorage.setItem('auth_token', token);
          set(
            {
              isAuthenticated: true,
              user,
              token,
              isLoading: false,
            },
            false,
            'auth/login'
          );
        },

        logout: () => {
          localStorage.removeItem('auth_token');
          set(
            {
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
            },
            false,
            'auth/logout'
          );
        },

        updateUser: (userData: Partial<User>) => {
          const { user } = get();
          if (user) {
            set(
              {
                user: { ...user, ...userData },
              },
              false,
              'auth/updateUser'
            );
          }
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, 'auth/setLoading');
        },

        refreshToken: async (): Promise<boolean> => {
          try {
            set({ isLoading: true }, false, 'auth/refreshToken/start');
            
            // TODO: Implement token refresh logic with your API
            const token = get().token;
            if (!token) return false;

            // For now, just return true if token exists
            set({ isLoading: false }, false, 'auth/refreshToken/success');
            return true;
          } catch (error) {
            console.error('Token refresh failed:', error);
            get().logout();
            return false;
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          token: state.token,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);