// ============================================================================
// USERS API
// ============================================================================

import { apiRequest } from './client';
import type { User, PaginatedResponse } from '../../types';

export interface UpdateUserRequest {
    name?: string;
    avatar_url?: string;
}

export interface ListUsersParams {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
}

export const usersApi = {
    list: async (params: ListUsersParams = {}): Promise<PaginatedResponse<User>> => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.role) queryParams.set('role', params.role);
        if (params.search) queryParams.set('search', params.search);

        const queryString = queryParams.toString();
        return apiRequest<PaginatedResponse<User>>(
            `/api/users${queryString ? `?${queryString}` : ''}`,
            { requireAuth: true }
        );
    },

    getById: async (id: number): Promise<User> => {
        return apiRequest<User>(`/api/users/${id}`, {
            requireAuth: true,
        });
    },

    update: async (id: number, data: UpdateUserRequest): Promise<User> => {
        return apiRequest<User>(`/api/users/${id}`, {
            method: 'PUT',
            body: data,
            requireAuth: true,
        });
    },

    delete: async (id: number): Promise<void> => {
        await apiRequest(`/api/users/${id}`, {
            method: 'DELETE',
            requireAuth: true,
        });
    },
};
