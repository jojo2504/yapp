// Submission types (from submission.go)

import type { BaseModel } from './base';
import type { Language, Verdict } from './enums';
import type { TestCaseResultResponse } from './testcase';

export interface Submission extends BaseModel {
    user_id: number;
    problem_id: number;
    language: Language;
    source_code: string;
    verdict: Verdict;
    execution_time_ms?: number;
    memory_usage_kb?: number;
    score?: number;
    error_message?: string;
    test_case_results?: TestCaseResult[];
}

export interface TestCaseResult extends BaseModel {
    submission_id: number;
    test_case_id: number;
    passed: boolean;
    actual_output?: string;
    execution_time_ms?: number;
    memory_usage_kb?: number;
    error_message?: string;
}

// Request DTO
export interface SubmitCodeRequest {
    problem_id: number;
    language: Language;
    source_code: string;
}

// Response DTO
export interface SubmissionResponse {
    id: number;
    verdict: Verdict;
    execution_time_ms?: number;
    memory_usage_kb?: number;
    score?: number;
    error_message?: string;
    test_case_results?: TestCaseResultResponse[];
}
