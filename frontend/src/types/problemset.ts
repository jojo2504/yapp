// ProblemSet types (from problem_set.go)

import { BaseModel } from './base';

// Note: Problem import omitted to avoid circular dependency
// Use Problem type from problem.ts when needed

export interface ProblemSet extends BaseModel {
    name: string;
    organisation_id: number;
    // problems?: Problem[]; // Import Problem separately if needed
}

export interface ProblemSetEnrollment extends BaseModel {
    user_id: number;
    problem_set_id: number;
    enrolled_at: string;
}

// Request DTOs
export interface CreateProblemSetRequest {
    name: string;
    organisation_id: number;
    problem_ids?: number[];
}

export interface UpdateProblemSetRequest {
    name?: string;
    problem_ids?: number[];
}
