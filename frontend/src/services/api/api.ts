// ============================================================================
// API BARREL EXPORT
// Import all APIs from here
// ============================================================================

// Client utilities
export {
    apiRequest,
    saveAuth,
    clearAuth,
    getAccessToken,
    getRefreshToken,
    getStoredUser,
    isAuthenticated,
} from './client';
export type { RequestOptions } from './client';

// APIs
export { authApi } from './auth.api';
export { problemsApi } from './problems.api';
export { submissionsApi } from './submissions.api';
export { coursesApi } from './courses.api';
export { usersApi } from './users.api';
export { leaderboardApi } from './leaderboard.api';
export { organisationsApi } from './organisations.api';
export { testCasesApi } from './testcases.api';

// Types (re-export for convenience)
export * from './types';

// Default export with all APIs
import { authApi } from './auth.api';
import { problemsApi } from './problems.api';
import { submissionsApi } from './submissions.api';
import { coursesApi } from './courses.api';
import { usersApi } from './users.api';
import { leaderboardApi } from './leaderboard.api';
import { organisationsApi } from './organisations.api';
import { testCasesApi } from './testcases.api';

const api = {
    auth: authApi,
    problems: problemsApi,
    submissions: submissionsApi,
    courses: coursesApi,
    users: usersApi,
    leaderboard: leaderboardApi,
    organisations: organisationsApi,
    testCases: testCasesApi,
};

export default api;
