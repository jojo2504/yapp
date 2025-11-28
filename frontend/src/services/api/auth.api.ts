// ============================================================================
// AUTH API
// ============================================================================

import { apiRequest, saveAuth, clearAuth, getRefreshToken } from './client';
import type { User, AuthResponse, RegisterRequest, ApiError } from '../../types';

export const authApi = {
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await apiRequest<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: data,
        });
        saveAuth(response);
        return response;
    },

    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await apiRequest<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        saveAuth(response);
        return response;
    },

    logout: async (): Promise<void> => {
        try {
            await apiRequest('/api/auth/logout', {
                method: 'POST',
                requireAuth: true,
            });
        } finally {
            clearAuth();
        }
    },

    getMe: async (): Promise<User> => {
        return apiRequest<User>('/api/auth/me', {
            requireAuth: true,
        });
    },

    refresh: async (): Promise<AuthResponse> => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw { error: 'Pas de refresh token', status: 401 } as ApiError;
        }

        const response = await apiRequest<AuthResponse>('/api/auth/refresh', {
            method: 'POST',
            body: { refresh_token: refreshToken },
        });
        saveAuth(response);
        return response;
    },
};
