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
