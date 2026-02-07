import { useState, useEffect, useCallback, createContext, useContext } from 'react';
// import { authService, FirebaseUser } from '../../data/services/authService';
// import { profileService, AuthUser } from '../../data/services/profileService';
import type { Profile, ProfileUpdate } from '../../domain/types';

// TODO: Re-enable Firebase auth — temporarily using mock auth for development
const DEV_SKIP_AUTH = true;

type FirebaseUser = any;
type AuthUser = Profile & { email: string };

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate & { vitality_streak?: number }) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@vision.app',
  display_name: 'Dev User',
  date_of_birth: null,
  gender: null,
  primary_health_goal: null,
  primary_physician: null,
  vitality_streak: 7,
  created_at: new Date().toISOString(),
};

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(DEV_SKIP_AUTH ? MOCK_USER : null);
  const [loading, setLoading] = useState(!DEV_SKIP_AUTH);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(async (_email: string, _password: string, _displayName?: string) => {
    return { success: true };
  }, []);

  const signIn = useCallback(async (_email: string, _password: string) => {
    setUser(MOCK_USER);
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    // In dev mode, keep user logged in; no-op
  }, []);

  const updateProfileFn = useCallback(async (updates: ProfileUpdate & { vitality_streak?: number }) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
    return { success: true };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const profile: Profile | null = user
    ? {
        id: user.id,
        display_name: user.display_name,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        primary_health_goal: user.primary_health_goal,
        primary_physician: user.primary_physician,
        vitality_streak: user.vitality_streak,
        created_at: user.created_at,
      }
    : null;

  return {
    user,
    firebaseUser: DEV_SKIP_AUTH ? {} : null,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    updateProfile: updateProfileFn,
    clearError,
  };
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
