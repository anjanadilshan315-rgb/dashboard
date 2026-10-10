/**
 * Client for the Wedding Invitation API — sales team (staff) side.
 *
 * - Session (tokens + user) lives in localStorage when "Remember my session"
 *   is ticked, otherwise in sessionStorage (cleared when the browser closes).
 * - Adds the Bearer token, refreshes once on TOKEN_EXPIRED and retries.
 * - Throws ApiError carrying the backend `code`, `message` and field `details`.
 */
import type { StaffUser } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1').replace(/\/$/, '');
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const SESSION_KEY = 'wedora.staff.session';
const SESSION_EVENT = 'wedora:staff-session';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresAt: string;
}

export interface Session {
  user: StaffUser;
  tokens: Tokens;
}

export interface FieldError {
  location: string;
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: FieldError[];

  constructor(status: number, code: string, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const d of this.details ?? []) if (d.field && !map[d.field]) map[d.field] = d.message;
    return map;
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && error.details?.length) return error.details.map((d) => d.message).join(' · ');
    return error.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Session storage
// ---------------------------------------------------------------------------

function storages(): Storage[] {
  if (typeof window === 'undefined') return [];
  try {
    return [window.localStorage, window.sessionStorage];
  } catch {
    return [];
  }
}

export function getSession(): Session | null {
  for (const store of storages()) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as Session;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function isRemembered(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

export function setSession(session: Session | null, remember = isRemembered()): void {
  for (const store of storages()) {
    try {
      store.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  if (session) {
    try {
      (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable */
    }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
}

export function updateSessionUser(user: StaffUser): void {
  const session = getSession();
  if (session) setSession({ ...session, user });
}

export function onSessionChange(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) callback();
  };
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: unknown;
}

export interface ApiResult<T> {
  data: T;
  message?: string;
  meta?: PageMeta;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const session = getSession();
      if (!session) return false;
      try {
        const res = await fetch(`${API_URL}/admin/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        setSession({ ...session, tokens: json.data.tokens });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}, retried = false): Promise<ApiResult<T>> {
  const { method = 'GET', body, form, auth = true, query } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const session = auth ? getSession() : null;
  if (session) headers.Authorization = `Bearer ${session.tokens.accessToken}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the backend running?');
  }

  if (res.status === 204) return { data: undefined as T };

  let json: { data?: T; message?: string; code?: string; details?: FieldError[]; meta?: PageMeta } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }

  if (res.status === 401 && auth && session && !retried && json.code === 'TOKEN_EXPIRED') {
    if (await refreshTokens()) return api<T>(path, options, true);
  }

  if (!res.ok) {
    if (res.status === 401 && auth && session) setSession(null);
    throw new ApiError(res.status, json.code ?? 'ERROR', json.message ?? `Request failed (${res.status})`, json.details);
  }

  return { data: json.data as T, message: json.message, meta: json.meta };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  const { data } = await api<Session>('/admin/auth/login', { method: 'POST', body: { email, password }, auth: false });
  setSession(data, remember);
  return data;
}

export async function logout(): Promise<void> {
  const session = getSession();
  setSession(null);
  if (session) {
    await api('/admin/auth/logout', { method: 'POST', body: { refreshToken: session.tokens.refreshToken }, auth: false }).catch(() => undefined);
  }
}
