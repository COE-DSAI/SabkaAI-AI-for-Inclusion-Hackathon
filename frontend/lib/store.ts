import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  user_type: string;
  trusted_contacts: string[];
  created_at: string;
}

interface WalkSession {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  status: string;
}

interface PendingAlert {
  id: number;
  type: string;
  timestamp: string;
}

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  activeSession: WalkSession | null;
  isWalking: boolean;
  pendingAlert: PendingAlert | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
  startSession: (session: WalkSession) => void;
  stopSession: () => void;
  setPendingAlert: (alert: PendingAlert | null) => void;
  clearPendingAlert: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      activeSession: null,
      isWalking: false,
      pendingAlert: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      clearUser: () => {
        if (typeof window !== 'undefined') {
          // Clear all auth and cache data
          localStorage.removeItem('access_token');
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_user_timestamp');
          localStorage.removeItem('cached_safety_score');
          localStorage.removeItem('cached_safety_score_timestamp');
          localStorage.removeItem('cached_safety_score_location');
        }
        set({
          user: null,
          isAuthenticated: false,
          activeSession: null,
          isWalking: false,
          pendingAlert: null
        });
      },

      startSession: (session) =>
        set({ activeSession: session, isWalking: true }),
      stopSession: () => set({ activeSession: null, isWalking: false }),

      setPendingAlert: (alert) => set({ pendingAlert: alert }),
      clearPendingAlert: () => set({ pendingAlert: null }),
    }),
    {
      name: 'protego-store',
      skipHydration: typeof window === 'undefined',
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate store:', error);
          // Clear corrupted data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('protego-store');
          }
          return;
        }

        // Validate rehydrated data
        if (state) {
          // Check if user data structure is valid
          if (state.user && (!state.user.id || !state.user.email)) {
            console.warn('Invalid user data in store, clearing...');
            state.clearUser();
          }

          // Check if session data is stale (older than 24 hours)
          if (state.activeSession && state.activeSession.start_time) {
            const startTime = new Date(state.activeSession.start_time).getTime();
            const now = Date.now();
            const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);

            if (hoursSinceStart > 24) {
              console.warn('Stale walk session detected, clearing...');
              state.stopSession();
            }
          }

          console.log('Zustand store rehydrated:', state.isAuthenticated);
        }
      },
    }
  )
);
