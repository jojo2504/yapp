package main

import "time"

// Common base fields for all models
type BaseModel struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ─── Role & User & Organisation ───────────────────────────────────────────────
// ? Stored in Postgres

type Role string

const (
	RoleTeacher Role = "Teacher"
	RoleStudent Role = "Student"
	RoleAdmin   Role = "Admin"
)

type User struct {
	BaseModel

	Name           string `json:"name"`
	Email          string `json:"email"`
	Role           Role   `json:"role"`
	OrganisationID *int64 `json:"organisation_id,omitempty"`
}

type Organisation struct {
	BaseModel

	Name         string `json:"name"`
	Localisation string `json:"localisation"`
}

// ─── Problems, Language, Sets, Difficulty ─────────────────────────────────────
// ? Stored in Postgres

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

type Language string

const (
	Python     Language = "Python"
	Rust       Language = "Rust"
	Csharp     Language = "Csharp"
	C          Language = "C"
	Cpp        Language = "Cpp"
	Javascript Language = "Javascript"
	Typescript Language = "Typescript"
	Go         Language = "Go"
	Java       Language = "Java"
	Swift      Language = "Swift"
)

type Problem struct {
	BaseModel

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

type ProblemSet struct {
	BaseModel

	Name           string     `json:"name"`
	OrganisationID int64      `json:"organisation_id"`
	Problems       []*Problem `json:"problems,omitempty" pg:"many2many:problem_problem_sets"`
}

type TestCase struct {
	BaseModel

	ProblemID uint64 `json:"problem_id"`
	Input     string `json:"input"`
	Expected  string `json:"expected"`
	Hidden    bool   `json:"hidden"`
}

// ─── Progress & History ───────────────────────────────────────────────────────
// ? Stored in Postgres

// We need to create one UserProblemProgress per (user, problem, problem_set)
type UserProblemProgress struct {
	BaseModel

	UserID              int64      `json:"user_id"`
	ProblemID           int64      `json:"problem_id"`
	ProblemSetID        *int64     `json:"problem_set_id,omitempty"`
	LatestVerdict       Verdict    `json:"latest_verdict"`
	LatestExecutionTime *uint32    `json:"latest_execution_time,omitempty"`
	LatestMemoryUsage   *uint32    `json:"latest_memory_usage,omitempty"`
	Attempts            int32      `json:"attempts"`
	LastSubmissionAt    *time.Time `json:"last_submission_at,omitempty"`
}

// ─── Verdict Enum ─────────────────────────────────────────────────────────────
// ! Not stored in databases

// Verdict represents the result of a submission
type Verdict string

const (
	VerdictPending             Verdict = "Pending"
	VerdictAccepted            Verdict = "Accepted"
	VerdictWrongAnswer         Verdict = "WrongAnswer"
	VerdictTimeLimitExceeded   Verdict = "TimeLimitExceeded"
	VerdictMemoryLimitExceeded Verdict = "MemoryLimitExceeded"
	VerdictRuntimeError        Verdict = "RuntimeError"
	VerdictCompilationError    Verdict = "CompilationError"
	VerdictInternalError       Verdict = "InternalError"
)

// ─── Submissions, Results ────────────────────────────────
// ! Not stored in databases

type Submission struct {
	BaseModel

	UserID        uint64           `json:"user_id"`
	ProblemID     uint64           `json:"problem_id"`
	Language      Language         `json:"language"`
	SourceCode    string           `json:"source_code"`
	Verdict       Verdict          `json:"verdict"`
	Message       *string          `json:"message,omitempty"` // judge explanation
	ExecutionTime *uint32          `json:"execution_time,omitempty"`
	MemoryUsage   *uint32          `json:"memory_usage,omitempty"`
	JudgeOutput   *string          `json:"judge_output,omitempty"`
	TestResults   []TestCaseResult `json:"test_results,omitempty"`
}

type TestCaseResult struct {
	TestCaseID    uint64  `json:"test_case_id"`
	Verdict       Verdict `json:"verdict"`
	ExecutionTime uint32  `json:"execution_time"`
	MemoryKB      uint32  `json:"memory_kb"`
}

// ─── Session / Authentification ───────────────────────────────────────────────
// ? Redis

type Session struct {
	BaseModel

	UserID    int64     `json:"user_id"`
	Token     string    `json:"token"` // refresh token UUID
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}
