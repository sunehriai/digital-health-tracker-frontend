import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import auth from '@react-native-firebase/auth';
import { authService } from '../../data/services/authService';
import { profileService } from '../../data/services/profileService';
import { onAccountDeactivated } from '../../data/api/client';
import { deletionService } from '../../data/services/deletionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricPrefs } from '../../data/utils/biometricPrefs';
import type { Profile, ProfileUpdate } from '../../domain/types';

type AuthUser = Profile & { email: string };

export interface DeactivationInfo {
  pending: boolean;
  deletionType: 'data_only' | 'full_account' | null;
  permanentDeletionDate: string | null;
  daysRemaining: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: any;
  profile: Profile | null;
  loading: boolean;
  profileFetchComplete: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  hoursSinceCreation: number;
  deactivationInfo: DeactivationInfo | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  clearDeactivation: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// A3: 50-minute token refresh interval (Firebase tokens expire at 60 min)
const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileFetchComplete, setProfileFetchComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivationInfo, setDeactivationInfo] = useState<DeactivationInfo | null>(null);
  const authInitialized = useRef(false);
  const activeRequestId = useRef(0);

  // A2: onAuthStateChanged is single source of truth
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // User is signed in — fetch profile from backend
        // Set loading false immediately so app doesn't show blank white screen
        // profileFetchComplete gates the age gate check separately
        setProfileFetchComplete(false);
        try {
          const profile = await profileService.getMe();
          setUser({ ...profile, email: fbUser.email || profile.email || '' });
          setProfileFetchComplete(true);

          // Cold-start verification check (Q9) — reload Firebase user to get fresh emailVerified
          try {
            await fbUser.reload();
            // Update firebaseUser state with reloaded reference so emailVerified is fresh
            setFirebaseUser(auth().currentUser);
          } catch {}
        } catch (err: any) {
          // If the error is auth-related (401/403), the account no longer exists
          // on the backend — sign out the stale Firebase session so the user
          // sees the login screen instead of a broken age gate.
          const msg = err?.message?.toLowerCase() ?? '';
          const isAuthError = msg.includes('401') || msg.includes('unauthorized') ||
            msg.includes('403') || msg.includes('not found') || msg.includes('user not found');
          if (isAuthError) {
            try {
              await authService.signOut();
              // Clear all user-scoped local state
              const allKeys = await AsyncStorage.getAllKeys();
              const userKeys = allKeys.filter(
                (k) => k.startsWith('@vision') || k.startsWith('@vitaquest:') ||
                  k.startsWith('@dose_status_cache') || k.startsWith('daySettled:')
              );
              if (userKeys.length > 0) await AsyncStorage.multiRemove(userKeys);
            } catch {}
            // onAuthStateChanged will fire again with null — don't set state here
            return;
          }

          // Backend might be unreachable (network error) — set basic user info from Firebase
          const providerId = fbUser.providerData?.[0]?.providerId ?? 'password';
          const auth_provider = providerId === 'google.com' ? 'google' : providerId === 'apple.com' ? 'apple' : 'email';
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            display_name: fbUser.displayName || null,
            date_of_birth: null,
            gender: null,
            primary_health_goal: null,
            primary_physician: null,
            created_at: new Date().toISOString(),
            total_xp: 0,
            current_tier: 1,
            streak_days: 0,
            timezone: null,
            streak_start_date: null,
            last_active_at: null,
            comeback_boost_until: null,
            waiver_badges: 0,
            perfect_months_streak: 0,
            is_deactivated: false,
            deletion_requested_at: null,
            deletion_type: null,
            auth_provider,
          });
          setProfileFetchComplete(true);

          // Cold-start verification check (Q9) — reload Firebase user to get fresh emailVerified
          try {
            await fbUser.reload();
            setFirebaseUser(auth().currentUser);
          } catch {}
        }

        // Save last login info for biometric fallback (C7)
        try {
          await biometricPrefs.setLastEmail(fbUser.email || '');
          const providerId = fbUser.providerData?.[0]?.providerId ?? 'password';
          const provider = providerId === 'google.com' ? 'google' : providerId === 'apple.com' ? 'apple' : 'email';
          await biometricPrefs.setLastProvider(provider);
        } catch {}
      } else {
        // User is signed out
        setUser(null);
        setProfileFetchComplete(false);
      }

      setLoading(false);
      authInitialized.current = true;
    });

    return unsubscribe;
  }, []);

  // A3: Proactive token refresh every 50 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await authService.getIdToken(true);
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  // R9: Listen for mid-session deactivation events from ApiClient
  useEffect(() => {
    const unsubscribe = onAccountDeactivated(async () => {
      try {
        const status = await deletionService.getDeletionStatus();
        if (status?.pending) {
          setDeactivationInfo({
            pending: true,
            deletionType: status.deletion_type as 'data_only' | 'full_account' | null,
            permanentDeletionDate: status.permanent_deletion_date,
            daysRemaining: status.days_remaining,
          });
        }
      } catch {
        setDeactivationInfo({
          pending: true,
          deletionType: null,
          permanentDeletionDate: null,
          daysRemaining: null,
        });
      }
    });
    return unsubscribe;
  }, []);

  // Check deactivation on auth establishment
  useEffect(() => {
    if (!user) return;

    const checkDeactivation = async () => {
      try {
        const profile = await profileService.getMe();
        setUser((prev) => prev ? { ...prev, ...profile } : prev);
        if (profile.is_deactivated) {
          const status = await deletionService.getDeletionStatus();
          if (status?.pending) {
            setDeactivationInfo({
              pending: true,
              deletionType: status.deletion_type as 'data_only' | 'full_account' | null,
              permanentDeletionDate: status.permanent_deletion_date,
              daysRemaining: status.days_remaining,
            });
          }
        }
      } catch {
        // Non-critical
      }
    };

    checkDeactivation();
  }, [user?.id]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    activeRequestId.current++;
    const requestId = activeRequestId.current;
    setError(null);
    setLoading(true);
    const signUpTimeout = setTimeout(() => {
      if (activeRequestId.current === requestId) {
        setError('Sign up timed out');
        setLoading(false);
      }
    }, 10000);
    try {
      await authService.signUp(email, password, displayName);
      clearTimeout(signUpTimeout);
      // onAuthStateChanged fires asynchronously. Explicitly call getMe()
      // to auto-provision the backend user, then push the display name.
      if (displayName) {
        try {
          // Ensure backend user exists (auto-provisioned on first getMe)
          await profileService.getMe();
          // Now update with the display name
          const updated = await profileService.updateMe({ display_name: displayName });
          setUser((prev) => prev ? { ...prev, ...updated } : prev);
        } catch {
          // Non-critical — profile will show on next refresh
        }
      }
      return { success: true };
    } catch (e: any) {
      clearTimeout(signUpTimeout);
      if (activeRequestId.current !== requestId) return { success: false, error: 'Request superseded' };
      const msg = e.message || 'Sign up failed';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    activeRequestId.current++;
    const requestId = activeRequestId.current;
    setError(null);
    setLoading(true);
    const signInTimeout = setTimeout(() => {
      if (activeRequestId.current === requestId) {
        setError('Sign in timed out');
        setLoading(false);
      }
    }, 10000);
    try {
      await authService.signIn(email, password);
      clearTimeout(signInTimeout);
      // onAuthStateChanged will fire automatically and set user state
      return { success: true };
    } catch (e: any) {
      clearTimeout(signInTimeout);
      if (activeRequestId.current !== requestId) return { success: false, error: 'Request superseded' };
      const msg = e.message || 'Sign in failed';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result.cancelled) {
        setLoading(false);
        return { success: false, cancelled: true };
      }
      // onAuthStateChanged will handle the rest
      return { success: true };
    } catch (e: any) {
      const msg = e.message || 'Google sign-in failed';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await authService.signInWithApple();
      if (result.cancelled) {
        setLoading(false);
        return { success: false, cancelled: true };
      }
      // onAuthStateChanged will handle the rest
      return { success: true };
    } catch (e: any) {
      const msg = e.message || 'Apple sign-in failed';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      // Clear ALL user-scoped local state so a new user gets a clean slate
      // (age gate, onboarding, dose cache, notification prefs, biometric, etc.)
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(
        (key) =>
          key.startsWith('@vision') ||
          key.startsWith('@vitaquest:') ||
          key.startsWith('@dose_status_cache') ||
          key.startsWith('daySettled:')
      );
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
      // onAuthStateChanged will fire and set user to null
      setDeactivationInfo(null);
    } catch (e: any) {
      setError(e.message || 'Sign out failed');
    }
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

  const refreshProfile = useCallback(async () => {
    try {
      const freshProfile = await profileService.getMe();
      setUser((prev) => prev ? { ...prev, ...freshProfile } : prev);
    } catch {
      // Non-critical
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearDeactivation = useCallback(() => setDeactivationInfo(null), []);

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
        is_deactivated: user.is_deactivated,
        deletion_requested_at: user.deletion_requested_at,
        deletion_type: user.deletion_type,
        auth_provider: user.auth_provider,
      }
    : null;

  // D1: Email verified if non-email provider OR Firebase emailVerified is true
  const isEmailVerified = user?.auth_provider !== 'email' || (firebaseUser?.emailVerified ?? false);

  // D2: Hours elapsed since account creation (server-issued created_at)
  const hoursSinceCreation = user?.created_at
    ? (Date.now() - new Date(user.created_at).getTime()) / 3600000
    : 0;

  return {
    user,
    firebaseUser,
    profile,
    loading,
    profileFetchComplete,
    error,
    isAuthenticated: !!user,
    isEmailVerified,
    hoursSinceCreation,
    deactivationInfo,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    updateProfile: updateProfileFn,
    refreshProfile,
    clearError,
    clearDeactivation,
  };
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
