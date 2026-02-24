import { useState, useEffect, useCallback, createContext, useContext } from 'react';
// import { authService, FirebaseUser } from '../../data/services/authService';
import { profileService } from '../../data/services/profileService';
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
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: AuthUser = {
  id: 'dev-user-123',
  email: 'dev@vision.app',
  display_name: 'Dev User',
  date_of_birth: null,
  gender: null,
  primary_health_goal: null,
  primary_physician: null,
  created_at: new Date().toISOString(),
  // Gamification defaults (display-only until useGamification fetches real data)
  total_xp: 0,
  current_tier: 1,
  streak_days: 0,
  timezone: 'America/New_York',
  streak_start_date: null,
  last_active_at: new Date().toISOString(),
  comeback_boost_until: null,
  waiver_badges: 0,
  perfect_months_streak: 0,
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

  const updateProfileFn = useCallback(async (updates: ProfileUpdate) => {
    try {
      const updated = await profileService.updateMe(updates);
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Profile update failed' };
    }
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
        created_at: user.created_at,
        total_xp: user.total_xp,
        current_tier: user.current_tier,
        streak_days: user.streak_days,
        timezone: user.timezone,
        streak_start_date: user.streak_start_date,
        last_active_at: user.last_active_at,
        comeback_boost_until: user.comeback_boost_until,
        waiver_badges: user.waiver_badges,
        perfect_months_streak: user.perfect_months_streak,
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
