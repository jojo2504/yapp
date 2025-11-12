package main

import (
	"backend/api/types/base"
	"backend/api/types/problem"
	"backend/api/types/submission"
	"backend/internal/redisService"
	"context"
	"time"
)

func dummySubmission() submission.Submission {
	message := "Accepted successfully"
	execTime := uint32(123)
	memUsage := uint32(2048)
	judgeOutput := "Program output matched all expected results"

	return submission.Submission{
		BaseModel: base.BaseModel{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:    42,
		ProblemID: 101,
		Language:  problem.Language("Go"), // or "rust", "cpp", etc.
		SourceCode: `package main
			import "fmt"

			func main() {
				fmt.Println("Hello, world!")
			}`,
		Verdict:       submission.Verdict("Accepted"),
		Message:       &message,
		ExecutionTime: &execTime,
		MemoryUsage:   &memUsage,
		JudgeOutput:   &judgeOutput,
		TestResults: []submission.TestCaseResult{
			{
				TestCaseID:    1,
				Verdict:       submission.Verdict("Accepted"),
				ExecutionTime: 45,
				MemoryKB:      512,
			},
			{
				TestCaseID:    2,
				Verdict:       submission.Verdict("Accepted"),
				ExecutionTime: 50,
				MemoryKB:      520,
			},
		},
	}
}

func main() {
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, "redis:6379", "", 0)
	println("init redis!")

	redisService.AddSubmission(&redis, dummySubmission())
}
