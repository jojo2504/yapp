package problem

import "backend/api/types/base"

type Problem struct {
    base.BaseModel

    Title       string        `json:"title"`
    Description string        `json:"description"`
    Language    Language      `json:"language"`
    ProblemSets []*ProblemSet `json:"problem_sets" pg:"many2many:problem_problem_sets"`
    Difficulty  Difficulty    `json:"difficulty_id"`
    TimeLimit   int           `json:"time_limit_ms,omitempty"`   // default 2000
    MemoryLimit int           `json:"memory_limit_mb,omitempty"` // default 50
    AuthorID    int64         `json:"author_id,omitempty"`
    Points      *int32        `json:"points,omitempty"`
    TestCases   []TestCase    `json:"test_cases,omitempty" pg:"rel:has-many"`
}
