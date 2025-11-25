// ============================================================================
// SUBMISSIONS API
// ============================================================================

import { apiRequest } from './client';
import type {
    Submission,
    SubmissionResponse,
    SubmitCodeRequest,
    PaginatedResponse,
} from '../../types';

export const submissionsApi = {
    submit: async (data: SubmitCodeRequest): Promise<SubmissionResponse> => {
        return apiRequest<SubmissionResponse>('/api/submit', {
            method: 'POST',
            body: data,
            requireAuth: true,
        });
    },

    getById: async (id: number): Promise<Submission> => {
        return apiRequest<Submission>(`/api/submissions/${id}`, {
            requireAuth: true,
        });
    },

    listByProblem: async (problemId: number): Promise<Submission[]> => {
        return apiRequest<Submission[]>(`/api/problems/${problemId}/submissions`, {
            requireAuth: true,
        });
    },

    listByUser: async (): Promise<PaginatedResponse<Submission>> => {
        return apiRequest<PaginatedResponse<Submission>>('/api/submissions', {
            requireAuth: true,
        });
    },
};
