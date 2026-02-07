/**
 * Frontend Logger
 *
 * Provides consistent logging with levels, timestamps, and context.
 * All logs go to console with color-coded output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_COLORS = {
  debug: '#9CA3AF', // gray
  info: '#3B82F6',  // blue
  warn: '#F59E0B',  // amber
  error: '#EF4444', // red
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set minimum log level (can be changed for production)
// @ts-ignore - __DEV__ is a React Native global
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
const MIN_LOG_LEVEL: LogLevel = isDev ? 'debug' : 'info';

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;

    const style = `color: ${LOG_COLORS[level]}; font-weight: bold;`;

    if (context && Object.keys(context).length > 0) {
      console.groupCollapsed(`%c${prefix} ${message}`, style);
      console.log('Context:', context);
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${message}`, style);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ERROR] [${this.module}]`;
    const style = `color: ${LOG_COLORS.error}; font-weight: bold;`;

    console.groupCollapsed(`%c${prefix} ${message}`, style);

    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else if (error) {
      console.error('Error:', error);
    }

    if (context && Object.keys(context).length > 0) {
      console.log('Context:', context);
    }

    console.groupEnd();
  }

  // Convenience method for API calls
  apiCall(method: string, endpoint: string, context?: LogContext): void {
    this.info(`API ${method} ${endpoint}`, context);
  }

  // Convenience method for API responses
  apiResponse(method: string, endpoint: string, status: number, context?: LogContext): void {
    if (status >= 400) {
      this.error(`API ${method} ${endpoint} failed`, undefined, { status, ...context });
    } else {
      this.info(`API ${method} ${endpoint} completed`, { status, ...context });
    }
  }
}

// Factory function to create loggers for different modules
export function createLogger(module: string): Logger {
  return new Logger(module);
}

// Pre-configured loggers for common modules
export const loggers = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  navigation: createLogger('Navigation'),
  aiScan: createLogger('AIScan'),
  medication: createLogger('Medication'),
  ui: createLogger('UI'),
};

// Default export for quick usage
export default createLogger;
