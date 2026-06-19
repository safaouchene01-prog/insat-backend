import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'clinic' | null;

interface MockUser {
  id: string;
  email: string;
  role: UserRole;
  nom: string;
  prenom?: string;
  profile_picture?: string;
  profile_picture_url?: string;
}

interface AuthState {
  user: MockUser | null;
  role: UserRole;
  isLoggedIn: boolean;
  setUser: (user: MockUser | null) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoggedIn: false,

      setUser: (user) =>
        set({
          user,
          role: user?.role ?? null,
          isLoggedIn: !!user,
        }),

      setRole: (role) => set({ role }),

      logout: () =>
        set({
          user: null,
          role: null,
          isLoggedIn: false,
        }),
    }),
    {
      name: 'insat-auth', // key in localStorage
    }
  )
);
