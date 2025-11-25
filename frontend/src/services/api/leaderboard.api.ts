// ============================================================================
// LEADERBOARD API
// ============================================================================

import { apiRequest } from './client';

export interface LeaderboardEntry {
    rank: number;
    user_id: number;
    user_name: string;
    avatar_url?: string;
    total_score: number;
    problems_solved: number;
    submissions_count: number;
}

export interface LeaderboardParams {
    problem_set_id?: number;
    organisation_id?: number;
    limit?: number;
}

export const leaderboardApi = {
    getGlobal: async (params: LeaderboardParams = {}): Promise<LeaderboardEntry[]> => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.organisation_id) queryParams.set('organisation_id', params.organisation_id.toString());

        const queryString = queryParams.toString();
        return apiRequest<LeaderboardEntry[]>(
            `/api/leaderboard${queryString ? `?${queryString}` : ''}`
        );
    },

    getByProblemSet: async (problemSetId: number, limit?: number): Promise<LeaderboardEntry[]> => {
        const queryParams = new URLSearchParams();
        if (limit) queryParams.set('limit', limit.toString());

        const queryString = queryParams.toString();
        return apiRequest<LeaderboardEntry[]>(
            `/api/problem-sets/${problemSetId}/leaderboard${queryString ? `?${queryString}` : ''}`
        );
    },

    getUserRank: async (userId: number): Promise<LeaderboardEntry> => {
        return apiRequest<LeaderboardEntry>(`/api/leaderboard/user/${userId}`);
    },

    getMyRank: async (): Promise<LeaderboardEntry> => {
        return apiRequest<LeaderboardEntry>('/api/leaderboard/me', {
            requireAuth: true,
        });
    },
};
