// import auth from '@react-native-firebase/auth';
import { API_BASE } from './endpoints';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ApiClient');

// TODO: Re-enable Firebase token — temporarily disabled for development
const DEV_SKIP_AUTH = true;

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

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        let message: string;
        try {
          const json = JSON.parse(text);
          message = json.detail || json.message || text;
        } catch {
          message = text;
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

      if (error instanceof Error && !error.message.includes('failed')) {
        logger.error(`${method} ${endpoint} network error`, error, { duration });
      }

      throw error;
    }
  }
}

export const apiClient = new ApiClient();
