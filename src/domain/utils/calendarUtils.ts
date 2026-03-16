export type AdherenceLevel = 'perfect' | 'delayed' | 'partial' | 'missed' | 'none';

/**
 * Maps adherence data to a 4-state display level.
 * 'perfect'  = all doses taken on time (solid cyan block).
 * 'delayed'  = all doses taken but some late (solid orange block).
 * 'partial'  = some taken, some missed (lighter teal block with border).
 * 'missed'   = 0% adherence (gray outline block).
 * 'none'     = no doses scheduled or future day.
 */
export function computeAdherenceLevel(
  pct: number | null,
  isOnTimePerfect: boolean,
  isAllTaken: boolean = false,
): AdherenceLevel {
  if (pct === null || pct === undefined) return 'none';
  if (isOnTimePerfect && pct === 100) return 'perfect';
  if (isAllTaken) return 'delayed'; // all taken, some late
  if (pct > 0) return 'partial';    // some taken, some missed
  return 'missed'; // pct === 0
}

/**
 * Builds a month grid for calendar display.
 * Returns 5 or 6 week rows, each a 7-element array (Sun=0 ... Sat=6).
 * Each cell is an ISO date string ("2026-03-05") or null for padding.
 */
export function buildMonthGrid(yearMonth: string): (string | null)[][] {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based

  const daysInMonth = new Date(year, month, 0).getDate();
  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat — Sunday-start grid, no offset needed
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // Sun=0

  const grid: (string | null)[][] = [];
  let currentRow: (string | null)[] = [];

  // Leading nulls for padding
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentRow.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
    currentRow.push(dateStr);
    if (currentRow.length === 7) {
      grid.push(currentRow);
      currentRow = [];
    }
  }

  // Trailing nulls for last row
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    grid.push(currentRow);
  }

  return grid;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Formats "2026-03" to "March 2026".
 */
export function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${yearStr}`;
}

/**
 * Returns true if the given ISO date string is after today (UTC).
 */
export function isFutureDate(dateStr: string): boolean {
  const today = todayDateStr();
  return dateStr > today;
}

/**
 * Returns today's date as ISO string "YYYY-MM-DD".
 */
export function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the current month as "YYYY-MM".
 */
export function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Navigate to the previous month.
 */
export function prevYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Navigate to the next month.
 */
export function nextYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
