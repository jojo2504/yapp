// ============================================================================
// TEST CASES API
// ============================================================================

import { apiRequest } from './client';
import type { TestCase, CreateTestCaseRequest } from '../../types';

export const testCasesApi = {
    listByProblem: async (problemId: number): Promise<TestCase[]> => {
        return apiRequest<TestCase[]>(`/api/problems/${problemId}/test-cases`, {
            requireAuth: true,
        });
    },

    create: async (problemId: number, data: CreateTestCaseRequest): Promise<TestCase> => {
        return apiRequest<TestCase>(`/api/problems/${problemId}/test-cases`, {
            method: 'POST',
            body: data,
            requireAuth: true,
        });
    },

    update: async (
        problemId: number,
        testCaseId: number,
        data: Partial<CreateTestCaseRequest>
    ): Promise<TestCase> => {
        return apiRequest<TestCase>(`/api/problems/${problemId}/test-cases/${testCaseId}`, {
            method: 'PUT',
            body: data,
            requireAuth: true,
        });
    },

    delete: async (problemId: number, testCaseId: number): Promise<void> => {
        await apiRequest(`/api/problems/${problemId}/test-cases/${testCaseId}`, {
            method: 'DELETE',
            requireAuth: true,
        });
    },
};
