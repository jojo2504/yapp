import { LS } from '../constants/storage';

const BASE = '';

/**
 * Thin wrapper around fetch that injects the Bearer token from localStorage
 * and deserialises the JSON response.  Throws on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(LS.TOKEN);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
