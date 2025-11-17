package submission

import (
	"backend/api/types/base"
	"backend/api/types/problem"
)

type Submission struct {
	base.BaseModel

	UserID        uint64            `json:"user_id"`
	ProblemID     uint64            `json:"problem_id"`
	Language      problem.Language  `json:"language"`
	SourceCode    string            `json:"source_code"`
	Verdict       *Verdict          `json:"verdict"`
	Message       *string           `json:"message,omitempty"` // judge explanation
	ExecutionTime *uint32           `json:"execution_time,omitempty"`
	MemoryUsage   *uint32           `json:"memory_usage,omitempty"`
	JudgeOutput   *string           `json:"judge_output,omitempty"`
	TestResults   *[]TestCaseResult `json:"test_results,omitempty"`
}
