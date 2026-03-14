/** Clamp a number to a range. Returns null if value is null/undefined. */
export function clampOpt(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return Math.min(Math.max(n, min), max);
}

/** Truncate a string to maxLen. Returns null if value is null/undefined. */
export function truncateOpt(value: unknown, maxLen: number): string | null {
  if (value == null) return null;
  return String(value).slice(0, maxLen);
}

/** Validate that a string is one of the allowed values. */
export function enumOpt(value: unknown, allowed: string[], fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return allowed.includes(value) ? value : fallback;
}

// Domain-specific bounds
export const BOUNDS = {
  weight: { min: 0, max: 9999 },       // lbs/kg
  reps: { min: 0, max: 9999 },
  rpe: { min: 0, max: 10 },
  sets: { min: 1, max: 100 },
  bodyWeight: { min: 1, max: 1500 },    // lbs
  calories: { min: 0, max: 99999 },
  macroGrams: { min: 0, max: 99999 },
  servings: { min: 0.01, max: 999 },
  age: { min: 1, max: 150 },
  heightIn: { min: 1, max: 120 },
  stringShort: 200,
  stringLong: 2000,
} as const;
