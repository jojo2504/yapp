// ============================================================================
// COURSES (PROBLEM SETS) API
// ============================================================================

import { apiRequest } from './client';
import type {
    ProblemSet,
    CreateProblemSetRequest,
    UpdateProblemSetRequest,
    PaginatedResponse,
} from '../../types';

export const coursesApi = {
    list: async (): Promise<PaginatedResponse<ProblemSet>> => {
        return apiRequest<PaginatedResponse<ProblemSet>>('/api/problem-sets');
    },

    getById: async (id: number): Promise<ProblemSet> => {
        return apiRequest<ProblemSet>(`/api/problem-sets/${id}`);
    },

    create: async (data: CreateProblemSetRequest): Promise<ProblemSet> => {
        return apiRequest<ProblemSet>('/api/problem-sets', {
            method: 'POST',
            body: data,
            requireAuth: true,
        });
    },

    update: async (id: number, data: UpdateProblemSetRequest): Promise<ProblemSet> => {
        return apiRequest<ProblemSet>(`/api/problem-sets/${id}`, {
            method: 'PUT',
            body: data,
            requireAuth: true,
        });
    },

    delete: async (id: number): Promise<void> => {
        await apiRequest(`/api/problem-sets/${id}`, {
            method: 'DELETE',
            requireAuth: true,
        });
    },

    enroll: async (id: number): Promise<void> => {
        await apiRequest(`/api/problem-sets/${id}/enroll`, {
            method: 'POST',
            requireAuth: true,
        });
    },

    unenroll: async (id: number): Promise<void> => {
        await apiRequest(`/api/problem-sets/${id}/unenroll`, {
            method: 'POST',
            requireAuth: true,
        });
    },
};
