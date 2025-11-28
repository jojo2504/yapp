// Problem types (from problem.go)

import { BaseModel } from './base';
import { Difficulty, Language } from './enums';
import { TestCase, CreateTestCaseRequest } from './testcase';
import { ProblemSet } from './problemset';

export interface Problem extends BaseModel {
    title: string;
    description: string;
    language: Language;
    difficulty: Difficulty;
    time_limit_ms: number;
    memory_limit_mb: number;
    author_id: number;
    points?: number;
    starter_code?: string;
    solution_code?: string;
    test_cases?: TestCase[];
    problem_sets?: ProblemSet[];
}

// Request DTOs
export interface CreateProblemRequest {
    title: string;
    description: string;
    language: Language;
    difficulty: Difficulty;
    time_limit_ms?: number;
    memory_limit_mb?: number;
    points?: number;
    starter_code?: string;
    solution_code?: string;
    test_cases?: CreateTestCaseRequest[];
}

export interface UpdateProblemRequest {
    title?: string;
    description?: string;
    language?: Language;
    difficulty?: Difficulty;
    time_limit_ms?: number;
    memory_limit_mb?: number;
    points?: number;
    starter_code?: string;
    solution_code?: string;
}

export interface ListProblemsParams {
    page?: number;
    limit?: number;
    language?: Language;
    difficulty?: Difficulty;
    search?: string;
}

// Response DTO
export interface ProblemListItem {
    id: number;
    title: string;
    language: Language;
    difficulty: Difficulty;
    points: number;
}
