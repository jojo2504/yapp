// TestCase types (from testcase.go)

import { BaseModel } from './base';

export interface TestCase extends BaseModel {
    problem_id: number;
    input: string;
    expected: string;
    hidden: boolean;
    position?: number;
}

// Request DTO
export interface CreateTestCaseRequest {
    input: string;
    expected: string;
    hidden: boolean;
    position?: number;
}

// Response DTO
export interface TestCaseResultResponse {
    test_case_id: number;
    passed: boolean;
    execution_time_ms?: number;
    error_message?: string;
}
