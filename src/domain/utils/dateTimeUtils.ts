/**
 * Shared date/time utilities for the Vision app.
 * All time-related formatting and comparison logic lives here.
 */

/**
 * Format 24h time string to 12h AM/PM format.
 * @param time24 - Time in "HH:MM" format (e.g., "14:30")
 * @returns Formatted string (e.g., "2:30 PM")
 */
export function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a Date object to 12h AM/PM format.
 */
export function formatTimeAMPM(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Check if a date is tomorrow.
 */
export function isTomorrow(date: Date): boolean {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

/**
 * Get start of today (midnight).
 */
export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format date for display (Today, Tomorrow, or weekday/date).
 */
export function formatDoseDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';

  const today = getStartOfToday();
  const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 6) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Parse time string and apply to a date.
 * @param date - Base date
 * @param timeOfDay - Time in "HH:MM" format
 * @returns New Date with time applied
 */
export function applyTimeToDate(date: Date, timeOfDay: string): Date {
  const [hours, minutes] = (timeOfDay || '08:00').split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// ============================================================
// LOCAL DATE UTILITIES (for AI Upload feature)
// ============================================================
// These functions handle dates in the user's local timezone.
// All medication dates are stored as YYYY-MM-DD strings without timezone.

/**
 * Get today's date in user's local timezone as YYYY-MM-DD string.
 * This is what the user perceives as "today".
 *
 * @param date - Optional date to format (defaults to now)
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date at midnight local time.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Check if a date string represents an expired date.
 *
 * @param expiryDateString - Expiry date in YYYY-MM-DD format
 * @returns true if the date is in the past
 */
export function isExpired(expiryDateString: string | null): boolean {
  if (!expiryDateString) return false;

  const expiry = parseLocalDate(expiryDateString);
  const today = getStartOfToday();

  return expiry.getTime() < today.getTime();
}

/**
 * Get the number of days until expiry.
 *
 * @param expiryDateString - Expiry date in YYYY-MM-DD format
 * @returns Number of days (negative if expired), or null if no date
 */
export function getDaysUntilExpiry(expiryDateString: string | null): number | null {
  if (!expiryDateString) return null;

  const expiry = parseLocalDate(expiryDateString);
  const today = getStartOfToday();

  const diffMs = expiry.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Expiry warning levels for UI display.
 */
export type ExpiryWarningLevel = 'none' | 'info' | 'warning' | 'error';

export interface ExpiryWarning {
  level: ExpiryWarningLevel;
  message: string | null;
  daysUntil: number | null;
}

/**
 * Get expiry warning information for display.
 *
 * @param expiryDateString - Expiry date in YYYY-MM-DD format
 * @returns Warning level and message
 */
export function getExpiryWarning(expiryDateString: string | null): ExpiryWarning {
  const daysUntil = getDaysUntilExpiry(expiryDateString);

  if (daysUntil === null) {
    return { level: 'none', message: null, daysUntil: null };
  }

  if (daysUntil < 0) {
    return {
      level: 'error',
      message: 'This medication is expired',
      daysUntil,
    };
  }

  if (daysUntil === 0) {
    return {
      level: 'error',
      message: 'This medication expires today',
      daysUntil,
    };
  }

  if (daysUntil <= 30) {
    return {
      level: 'warning',
      message: `Expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      daysUntil,
    };
  }

  if (daysUntil <= 90) {
    return {
      level: 'info',
      message: `Expires in ${daysUntil} days`,
      daysUntil,
    };
  }

  return { level: 'none', message: null, daysUntil };
}

/**
 * Format a YYYY-MM-DD string to a human-readable format.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateString(
  dateString: string | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!dateString) return '';

  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', options);
}
