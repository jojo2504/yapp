// ============================================================================
// ORGANISATIONS API
// ============================================================================

import { apiRequest } from './client';
import type { Organisation } from '../../types';

export const organisationsApi = {
    list: async (): Promise<Organisation[]> => {
        return apiRequest<Organisation[]>('/api/organisations');
    },

    getById: async (id: number): Promise<Organisation> => {
        return apiRequest<Organisation>(`/api/organisations/${id}`);
    },
};
