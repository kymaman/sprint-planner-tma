import type { Sprint } from '@/model/types';

const API_BASE = 'https://s1.catbank.app:9510';

export interface OAuthStatus {
  connected: boolean;
}

export interface OAuthUrl {
  url: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  changedTasks: Array<{
    taskId: string;
    newWeek: number;
    newDay: number;
  }>;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  fromSprint: boolean;
}

class CalendarAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'CalendarAPIError';
  }
}

async function apiFetch<T>(
  endpoint: string,
  initDataRaw: string | undefined,
  options?: RequestInit
): Promise<T> {
  if (!initDataRaw) {
    throw new CalendarAPIError('Missing Telegram init data');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tg-Init-Data': initDataRaw,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new CalendarAPIError(
      error.error || `HTTP ${response.status}`,
      response.status
    );
  }

  return response.json();
}

export async function getOAuthStatus(initDataRaw: string | undefined): Promise<OAuthStatus> {
  return apiFetch<OAuthStatus>('/oauth/status', initDataRaw);
}

export async function getOAuthUrl(initDataRaw: string | undefined): Promise<OAuthUrl> {
  return apiFetch<OAuthUrl>('/oauth/url', initDataRaw);
}

export async function submitOAuthCode(
  initDataRaw: string | undefined,
  code: string
): Promise<{ ok: boolean }> {
  return apiFetch('/oauth/code', initDataRaw, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function syncSprint(
  initDataRaw: string | undefined,
  sprint: Sprint
): Promise<SyncResult> {
  return apiFetch<SyncResult>('/sync', initDataRaw, {
    method: 'POST',
    body: JSON.stringify({ sprint }),
  });
}

export async function getEvents(
  initDataRaw: string | undefined,
  from: string,
  to: string
): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>(
    `/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    initDataRaw
  );
}

export { CalendarAPIError };
