/**
 * AI Upload Context
 *
 * Implements the Hoisted State Pattern for AI medication upload.
 * This context owns ALL form state - screens read directly from context.
 * No local state duplication or useEffect sync needed.
 *
 * Flow:
 * 1. User captures images → stored in context
 * 2. AI analyzes → raw response stored in context
 * 3. Transform runs → form data + confidence stored in context
 * 4. ManualMedicationEntryScreen reads formData directly from context
 * 5. User edits → edits stored in context (originalValues preserved)
 * 6. Save → context data sent to API, then context reset
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import {
  GeminiResponse,
  MedicationFormData,
  TransformResult,
  transformGeminiResponse,
} from '../../domain/utils/aiTransformUtils';
import { FieldStatus, ConfidenceLevel } from '../../domain/utils/confidenceUtils';
import { ImageInfo } from '../../domain/utils/imageValidation';

// ============================================================
// TYPES
// ============================================================

export type AIUploadPhase =
  | 'idle'           // Not started
  | 'consent'        // Showing consent modal
  | 'capture'        // Image capture screen
  | 'analyzing'      // API call in progress
  | 'review'         // Review/Quick Save decision
  | 'editing'        // Full edit mode (ManualMedicationEntryScreen)
  | 'saving'         // Saving to backend
  | 'complete'       // Successfully saved
  | 'error';         // Error state

export interface CapturedImages {
  front: ImageInfo | null;
  back: ImageInfo | null;
}

export interface AIUploadState {
  // Phase tracking
  phase: AIUploadPhase;

  // Consent
  hasConsented: boolean;

  // Images
  images: CapturedImages;

  // Raw AI response
  rawResponse: GeminiResponse | null;

  // Transformed form data (source of truth for form fields)
  formData: MedicationFormData | null;
  originalFormData: MedicationFormData | null; // For tracking user edits

  // Confidence tracking
  fieldConfidence: Record<string, number>;
  fieldStatus: FieldStatus;
  averageConfidence: number | null;

  // Warnings/errors from transform
  warnings: string[];
  errors: string[];

  // Flags
  flaggedForReview: boolean;
  hasUserEdits: boolean;

  // Error state
  errorMessage: string | null;
  errorCode: string | null;
}

// ============================================================
// ACTIONS
// ============================================================

type AIUploadAction =
  | { type: 'SET_PHASE'; phase: AIUploadPhase }
  | { type: 'SET_CONSENT'; consented: boolean }
  | { type: 'SET_FRONT_IMAGE'; image: ImageInfo | null }
  | { type: 'SET_BACK_IMAGE'; image: ImageInfo | null }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'SET_RAW_RESPONSE'; response: GeminiResponse }
  | { type: 'SET_TRANSFORM_RESULT'; result: TransformResult }
  | { type: 'UPDATE_FORM_FIELD'; field: keyof MedicationFormData; value: any }
  | { type: 'SET_ERROR'; message: string; code?: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ============================================================
// INITIAL STATE
// ============================================================

const initialState: AIUploadState = {
  phase: 'idle',
  hasConsented: false,
  images: { front: null, back: null },
  rawResponse: null,
  formData: null,
  originalFormData: null,
  fieldConfidence: {},
  fieldStatus: {},
  averageConfidence: null,
  warnings: [],
  errors: [],
  flaggedForReview: false,
  hasUserEdits: false,
  errorMessage: null,
  errorCode: null,
};

// ============================================================
// REDUCER
// ============================================================

function aiUploadReducer(state: AIUploadState, action: AIUploadAction): AIUploadState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_CONSENT':
      return {
        ...state,
        hasConsented: action.consented,
        phase: action.consented ? 'capture' : 'idle',
      };

    case 'SET_FRONT_IMAGE':
      return {
        ...state,
        images: { ...state.images, front: action.image },
      };

    case 'SET_BACK_IMAGE':
      return {
        ...state,
        images: { ...state.images, back: action.image },
      };

    case 'CLEAR_IMAGES':
      return {
        ...state,
        images: { front: null, back: null },
      };

    case 'SET_RAW_RESPONSE':
      return {
        ...state,
        rawResponse: action.response,
      };

    case 'SET_TRANSFORM_RESULT':
      return {
        ...state,
        formData: action.result.data,
        originalFormData: action.result.data ? { ...action.result.data } : null,
        fieldConfidence: action.result.fieldConfidence,
        fieldStatus: action.result.fieldStatus,
        averageConfidence: action.result.averageConfidence,
        warnings: action.result.warnings,
        errors: action.result.errors,
        flaggedForReview: action.result.flaggedForReview,
        hasUserEdits: false,
        phase: action.result.success ? 'review' : 'error',
        errorMessage: action.result.success ? null : action.result.errors[0] || 'Unknown error',
      };

    case 'UPDATE_FORM_FIELD':
      if (!state.formData) return state;

      const updatedFormData = {
        ...state.formData,
        [action.field]: action.value,
      };

      // Check if user has made edits
      const hasEdits = state.originalFormData
        ? JSON.stringify(updatedFormData) !== JSON.stringify(state.originalFormData)
        : true;

      return {
        ...state,
        formData: updatedFormData,
        hasUserEdits: hasEdits,
      };

    case 'SET_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
        errorCode: action.code || null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        errorMessage: null,
        errorCode: null,
        phase: state.hasConsented ? 'capture' : 'idle',
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================
// CONTEXT
// ============================================================

interface AIUploadContextValue {
  state: AIUploadState;

  // Phase actions
  startUpload: () => void;
  showConsent: () => void;
  acceptConsent: () => void;
  declineConsent: () => void;

  // Image actions
  setFrontImage: (image: ImageInfo | null) => void;
  setBackImage: (image: ImageInfo | null) => void;
  clearImages: () => void;

  // Analysis actions
  startAnalysis: () => void;
  handleAnalysisSuccess: (response: GeminiResponse) => void;
  handleAnalysisError: (message: string, code?: string) => void;

  // Form actions
  updateFormField: <K extends keyof MedicationFormData>(field: K, value: MedicationFormData[K]) => void;
  goToEdit: () => void;

  // Completion actions
  startSaving: () => void;
  completeSave: () => void;
  reset: () => void;

  // Computed values
  canAnalyze: boolean;
  canQuickSave: boolean;
  isAIMode: boolean;
}

const AIUploadContext = createContext<AIUploadContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface AIUploadProviderProps {
  children: ReactNode;
}

export function AIUploadProvider({ children }: AIUploadProviderProps) {
  const [state, dispatch] = useReducer(aiUploadReducer, initialState);

  // Phase actions
  const startUpload = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'consent' });
  }, []);

  const showConsent = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'consent' });
  }, []);

  const acceptConsent = useCallback(() => {
    dispatch({ type: 'SET_CONSENT', consented: true });
  }, []);

  const declineConsent = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Image actions
  const setFrontImage = useCallback((image: ImageInfo | null) => {
    dispatch({ type: 'SET_FRONT_IMAGE', image });
  }, []);

  const setBackImage = useCallback((image: ImageInfo | null) => {
    dispatch({ type: 'SET_BACK_IMAGE', image });
  }, []);

  const clearImages = useCallback(() => {
    dispatch({ type: 'CLEAR_IMAGES' });
  }, []);

  // Analysis actions
  const startAnalysis = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'analyzing' });
  }, []);

  const handleAnalysisSuccess = useCallback((response: GeminiResponse) => {
    dispatch({ type: 'SET_RAW_RESPONSE', response });

    // Transform the response
    const result = transformGeminiResponse(response);
    dispatch({ type: 'SET_TRANSFORM_RESULT', result });
  }, []);

  const handleAnalysisError = useCallback((message: string, code?: string) => {
    dispatch({ type: 'SET_ERROR', message, code });
  }, []);

  // Form actions
  const updateFormField = useCallback(<K extends keyof MedicationFormData>(
    field: K,
    value: MedicationFormData[K]
  ) => {
    dispatch({ type: 'UPDATE_FORM_FIELD', field, value });
  }, []);

  const goToEdit = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'editing' });
  }, []);

  // Completion actions
  const startSaving = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'saving' });
  }, []);

  const completeSave = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'complete' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Computed values
  const canAnalyze = useMemo(() => {
    return state.images.front !== null && state.phase === 'capture';
  }, [state.images.front, state.phase]);

  const canQuickSave = useMemo(() => {
    if (!state.formData) return false;
    if (state.flaggedForReview) return false;
    if (!state.formData.name) return false;
    if (state.formData.initialStock <= 0) return false;

    // Check all confidence scores meet threshold (0.90)
    const QUICK_SAVE_THRESHOLD = 0.90;
    for (const [field, confidence] of Object.entries(state.fieldConfidence)) {
      if (confidence < QUICK_SAVE_THRESHOLD) return false;
    }

    return true;
  }, [state.formData, state.flaggedForReview, state.fieldConfidence]);

  const isAIMode = useMemo(() => {
    return state.phase !== 'idle' && state.hasConsented;
  }, [state.phase, state.hasConsented]);

  const value: AIUploadContextValue = useMemo(() => ({
    state,
    startUpload,
    showConsent,
    acceptConsent,
    declineConsent,
    setFrontImage,
    setBackImage,
    clearImages,
    startAnalysis,
    handleAnalysisSuccess,
    handleAnalysisError,
    updateFormField,
    goToEdit,
    startSaving,
    completeSave,
    reset,
    canAnalyze,
    canQuickSave,
    isAIMode,
  }), [
    state,
    startUpload,
    showConsent,
    acceptConsent,
    declineConsent,
    setFrontImage,
    setBackImage,
    clearImages,
    startAnalysis,
    handleAnalysisSuccess,
    handleAnalysisError,
    updateFormField,
    goToEdit,
    startSaving,
    completeSave,
    reset,
    canAnalyze,
    canQuickSave,
    isAIMode,
  ]);

  return (
    <AIUploadContext.Provider value={value}>
      {children}
    </AIUploadContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAIUpload(): AIUploadContextValue {
  const context = useContext(AIUploadContext);
  if (!context) {
    throw new Error('useAIUpload must be used within an AIUploadProvider');
  }
  return context;
}

/**
 * Hook to check if we're in AI mode without full context access.
 * Useful for conditional rendering in screens.
 */
export function useIsAIMode(): boolean {
  const context = useContext(AIUploadContext);
  return context?.isAIMode ?? false;
}
