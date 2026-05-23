import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  tenant_id?: string;
  tenantId?: string;
  avatar_url?: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  preferences?: any;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, tenantSlug: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken, tenantSlug) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tenantSlug', tenantSlug);
        // Also set a cookie so Next.js middleware can detect auth server-side
        document.cookie = `boss-token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        set({ user, accessToken, refreshToken, tenantSlug, isAuthenticated: true });
      },
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tenantSlug');
        // Clear the middleware cookie too
        document.cookie = 'boss-token=; path=/; max-age=0';
        set({ user: null, accessToken: null, refreshToken: null, tenantSlug: null, isAuthenticated: false });
      },
    }),
    {
      name: 'boss-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
