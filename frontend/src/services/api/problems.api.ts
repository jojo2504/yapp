// ============================================================================
// PROBLEMS API
// ============================================================================

import { apiRequest } from './client';
import type {
    Problem,
    ProblemListItem,
    ListProblemsParams,
    CreateProblemRequest,
    UpdateProblemRequest,
    PaginatedResponse,
} from '../../types';

export const problemsApi = {
    list: async (params: ListProblemsParams = {}): Promise<PaginatedResponse<ProblemListItem>> => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.language) queryParams.set('language', params.language);
        if (params.difficulty) queryParams.set('difficulty', params.difficulty);
        if (params.search) queryParams.set('search', params.search);

        const queryString = queryParams.toString();
        return apiRequest<PaginatedResponse<ProblemListItem>>(
            `/api/problems${queryString ? `?${queryString}` : ''}`
        );
    },

    getById: async (id: number): Promise<Problem> => {
        return apiRequest<Problem>(`/api/problems/${id}`);
    },

    create: async (data: CreateProblemRequest): Promise<Problem> => {
        return apiRequest<Problem>('/api/problems', {
            method: 'POST',
            body: data,
            requireAuth: true,
        });
    },

    update: async (id: number, data: UpdateProblemRequest): Promise<Problem> => {
        return apiRequest<Problem>(`/api/problems/${id}`, {
            method: 'PUT',
            body: data,
            requireAuth: true,
        });
    },

    delete: async (id: number): Promise<void> => {
        await apiRequest(`/api/problems/${id}`, {
            method: 'DELETE',
            requireAuth: true,
        });
    },
};
