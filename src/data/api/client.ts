import { authService } from '../services/authService';
import { API_BASE } from './endpoints';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ApiClient');

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
    return authService.getIdToken();
  }

  /** Guard: silently reject API calls when no user is signed in. */
  private isAuthenticated(): boolean {
    return authService.getCurrentUser() !== null;
  }

  private async parseErrorResponse(
    response: Response,
    method: string,
    endpoint: string,
    duration: number,
  ): Promise<never> {
    const text = await response.text();
    let message: string;
    let errorCode: string | undefined;

    try {
      const json = JSON.parse(text);
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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Guard: silently reject API calls when no user is signed in.
    // Returns empty response — callers must handle undefined/null.
    if (!this.isAuthenticated() && !endpoint.includes('/health')) {
      return [] as unknown as T;
    }

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

      // A4: 401 → force refresh token → retry once
      if (response.status === 401 && token) {
        logger.info(`${method} ${endpoint} got 401, attempting token refresh`);
        const freshToken = await authService.getIdToken(true);
        if (freshToken) {
          const retryHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`,
            ...options.headers,
          };
          const retryResponse = await fetch(`${apiBaseOverride ?? API_BASE}${endpoint}`, {
            ...options,
            headers: retryHeaders,
          });
          const retryDuration = Date.now() - startTime;

          if (!retryResponse.ok) {
            await this.parseErrorResponse(retryResponse, method, endpoint, retryDuration);
          }

          logger.info(`${method} ${endpoint} retry succeeded`, {
            status: retryResponse.status,
            duration: retryDuration,
          });

          if (retryResponse.status === 204) return undefined as T;
          return retryResponse.json();
        }
      }

      if (!response.ok) {
        await this.parseErrorResponse(response, method, endpoint, duration);
      }

      logger.info(`${method} ${endpoint} completed`, {
        status: response.status,
        duration,
      });

      if (response.status === 204) return undefined as T;
      return response.json();
    } catch (error) {
      const duration = Date.now() - startTime;

      // Don't log auth guard or already-handled errors
      if (error instanceof AccountDeactivatedError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('failed')) {
        throw error;
      }

      logger.error(`${method} ${endpoint} network error`, error as Error, { duration });
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
