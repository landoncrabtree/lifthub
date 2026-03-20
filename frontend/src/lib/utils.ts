/**
 * Concatenates class names, filtering out falsy values.
 * Lightweight alternative to clsx/classnames.
 */
export function cn(
  ...classes: (string | boolean | number | undefined | null)[]
): string {
  return classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ');
}

/**
 * Format a Date as YYYY-MM-DD in the device's local timezone.
 * Use this instead of date.toISOString().slice(0,10) which converts to UTC
 * and causes day-boundary mismatches for non-UTC users.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a UTC timestamp from the backend (SQLite CURRENT_TIMESTAMP format)
 * into a proper Date object. SQLite returns "YYYY-MM-DD HH:MM:SS" without
 * a timezone indicator — this ensures it's treated as UTC.
 */
export function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Already has timezone info
  if (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // SQLite format: "2026-03-09 22:31:00" → append Z for UTC
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

/**
 * Detect whether the app is currently running as an installed standalone PWA.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
