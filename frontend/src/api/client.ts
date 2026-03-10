import { AuthTokens, ApiError } from '@/types';

const BASE_URL = '/api';

let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');
let onAuthError: (() => void) | null = null;

export function setTokens(tokens: AuthTokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthError(handler: () => void) {
  onAuthError = handler;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers });
    } else {
      clearTokens();
      onAuthError?.();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      error: `HTTP ${res.status}`,
    }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Response cache ──────────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30s — stale data served instantly, refresh in background
const inflight = new Map<string, Promise<unknown>>();

function getCached<T>(path: string): T | undefined {
  const entry = cache.get(path);
  if (!entry) return undefined;
  return entry.data as T;
}

function setCached(path: string, data: unknown) {
  cache.set(path, { data, ts: Date.now() });
}

function isStale(path: string): boolean {
  const entry = cache.get(path);
  if (!entry) return true;
  return Date.now() - entry.ts > CACHE_TTL;
}

export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.startsWith(pathPrefix)) cache.delete(key);
  }
}

// Prefetch common endpoints on app load
const PREFETCH_PATHS = [
  '/exercises',
  '/templates',
  '/workouts',
  '/progress/summary',
  '/nutrition/profile',
  '/nutrition/log?days=30',
  '/nutrition/charts',
  '/foods/custom-meals',
];

export function prefetchAll() {
  for (const path of PREFETCH_PATHS) {
    if (!cache.has(path)) {
      get(path).catch(() => {}); // fire-and-forget
    }
  }
}

// Convenience methods
export const get = <T>(path: string): Promise<T> => {
  const cached = getCached<T>(path);

  // Return cached immediately if fresh
  if (cached !== undefined && !isStale(path)) {
    return Promise.resolve(cached);
  }

  // Deduplicate inflight requests
  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const request = api<T>(path).then((data) => {
    setCached(path, data);
    inflight.delete(path);
    return data;
  }).catch((err) => {
    inflight.delete(path);
    // Return stale cache on error if available
    if (cached !== undefined) return cached;
    throw err;
  });

  inflight.set(path, request);

  // If we have stale data, return it immediately and refresh in background
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  return request;
};
export const post = <T>(path: string, body: unknown) => {
  const prefix = path.replace(/\/[^/]*$/, '');
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) }).then((data) => {
    invalidateCache(prefix);
    return data;
  });
};
export const put = <T>(path: string, body: unknown) => {
  const prefix = path.replace(/\/[^/]*$/, '');
  return api<T>(path, { method: 'PUT', body: JSON.stringify(body) }).then((data) => {
    invalidateCache(prefix);
    return data;
  });
};
export const del = <T>(path: string) => {
  const prefix = path.replace(/\/[^/]*$/, '');
  return api<T>(path, { method: 'DELETE' }).then((data) => {
    invalidateCache(prefix);
    return data;
  });
};
