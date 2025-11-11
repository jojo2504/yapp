package problem

import "backend/api/types/base"

type TestCase struct {
	base.BaseModel

	ProblemID uint64 `json:"problem_id"`
	Input     string `json:"input"`
	Expected  string `json:"expected"`
	Hidden    bool   `json:"hidden"`
}
