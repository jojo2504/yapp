// ============================================================================
// API CLIENT - Base configuration for all API calls
// ============================================================================

import type { ApiError, AuthResponse, User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const ACCESS_TOKEN_KEY = 'yapp_access_token';
const REFRESH_TOKEN_KEY = 'yapp_refresh_token';
const USER_KEY = 'yapp_user';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export const saveAuth = (auth: AuthResponse): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

export const clearAuth = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};

// ============================================================================
// API REQUEST FUNCTION
// ============================================================================

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    requireAuth?: boolean;
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const {
        method = 'GET',
        body,
        headers = {},
        requireAuth = false,
    } = options;

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    const token = getAccessToken();
    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    } else if (requireAuth) {
        throw { error: 'Non authentifié', status: 401 } as ApiError;
    }

    const requestConfig: RequestInit = {
        method,
        headers: requestHeaders,
    };

    if (body) {
        requestConfig.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, requestConfig);
        const data = await response.json().catch(() => ({}));

        if (response.status === 401 && getRefreshToken()) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                return apiRequest<T>(endpoint, options);
            } else {
                clearAuth();
                window.location.href = '/login';
                throw { error: 'Session expirée', status: 401 } as ApiError;
            }
        }

        if (!response.ok) {
            throw {
                error: data.error || 'Une erreur est survenue',
                details: data.details,
                status: response.status,
            } as ApiError;
        }

        return data as T;
    } catch (error) {
        if ((error as ApiError).status) {
            throw error;
        }
        throw {
            error: 'Erreur de connexion au serveur',
            status: 0,
        } as ApiError;
    }
}

async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return false;

        const data: AuthResponse = await response.json();
        saveAuth(data);
        return true;
    } catch {
        return false;
    }
}
