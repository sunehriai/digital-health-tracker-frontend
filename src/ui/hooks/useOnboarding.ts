import { useContext } from 'react';
import { OnboardingContext, OnboardingProvider } from '../contexts/OnboardingContext';
import type { OnboardingContextType } from '../../domain/types';

export function useOnboarding(): OnboardingContextType {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

export { OnboardingProvider };
