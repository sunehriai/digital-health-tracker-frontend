// import auth from '@react-native-firebase/auth';
import { API_BASE } from './endpoints';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ApiClient');

// TODO: Re-enable Firebase token — temporarily disabled for development
const DEV_SKIP_AUTH = true;

/** Step 38: Dev-only API base override for environment switching. */
let apiBaseOverride: string | null = null;

export function setApiBase(url: string | null): void {
  if (!__DEV__) {
    console.warn('setApiBase disabled in production');
    return;
  }
  apiBaseOverride = url;
}

/**
 * R19: Structured error for deactivated accounts.
 * Thrown when backend returns 403 with code "ACCOUNT_DEACTIVATED".
 */
export class AccountDeactivatedError extends Error {
  constructor(message: string = 'Account deactivated') {
    super(message);
    this.name = 'AccountDeactivatedError';
  }
}

/** Listeners for account deactivation events (R9: mid-session detection). */
type DeactivationListener = () => void;
const deactivationListeners: Set<DeactivationListener> = new Set();

export function onAccountDeactivated(listener: DeactivationListener): () => void {
  deactivationListeners.add(listener);
  return () => deactivationListeners.delete(listener);
}

export function notifyDeactivation() {
  deactivationListeners.forEach((listener) => listener());
}

class ApiClient {
  private async getToken(): Promise<string | null> {
    if (DEV_SKIP_AUTH) return null;
    // const user = auth().currentUser;
    // if (!user) return null;
    // return user.getIdToken();
    return null;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();

    logger.info(`${method} ${endpoint}`, {
      hasBody: !!options.body,
      bodySize: options.body ? (options.body as string).length : 0,
    });

    try {
      const token = await this.getToken();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      const response = await fetch(`${apiBaseOverride ?? API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        let message: string;
        let errorCode: string | undefined;

        try {
          const json = JSON.parse(text);
          // R19: Check for structured ACCOUNT_DEACTIVATED error code
          if (json.detail && typeof json.detail === 'object') {
            errorCode = json.detail.code;
            message = json.detail.message || text;
          } else {
            message = json.detail || json.message || text;
          }
        } catch {
          message = text;
        }

        // R19/R9: Detect deactivated account and notify listeners
        if (response.status === 403 && errorCode === 'ACCOUNT_DEACTIVATED') {
          logger.error(`${method} ${endpoint} — account deactivated`, new Error(message), {
            status: response.status,
            duration,
          });
          notifyDeactivation();
          throw new AccountDeactivatedError(message);
        }

        logger.error(`${method} ${endpoint} failed`, new Error(message), {
          status: response.status,
          duration,
        });

        throw new Error(message);
      }

      logger.info(`${method} ${endpoint} completed`, {
        status: response.status,
        duration,
      });

      if (response.status === 204) return undefined as T;
      return response.json();
    } catch (error) {
      const duration = Date.now() - startTime;

      // Don't double-log AccountDeactivatedError or already-logged errors
      if (
        error instanceof AccountDeactivatedError ||
        (error instanceof Error && error.message.includes('failed'))
      ) {
        throw error;
      }

      logger.error(`${method} ${endpoint} network error`, error as Error, { duration });
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
