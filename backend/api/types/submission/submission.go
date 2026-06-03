package submission

import (
	"fmt"

	"backend/api/types/base"
	"backend/api/types/problem"
)

// PlaygroundIDBase is the lower bound for playground submission IDs. Any
// submission ID at or above this value is a playground run that lives only in
// Redis (no DB row). DB submissions use BIGSERIAL starting at 1, so this offset
// guarantees no collision in practice.
const PlaygroundIDBase int64 = 1_000_000_000_000_000

// IsPlaygroundID reports whether the given submission ID refers to a
// playground run (Redis-backed) rather than a persisted submission.
func IsPlaygroundID(id int64) bool { return id >= PlaygroundIDBase }

// PlaygroundResultKey returns the Redis key holding the latest result JSON
// for a playground submission.
func PlaygroundResultKey(id int64) string {
    return fmt.Sprintf("playground:result:%d", id)
}

// InlineTestCase carries a single test case embedded in the Redis submission
// message for challenge submissions. Not stored in the DB (gorm:"-").
//
// Validator is a complete teacher-written program in the same language as the
// student's submission. The judge concatenates the student's source with
// Validator (or compiles them as two classes for Java) and runs the result —
// the validator decides its own inputs, calls the student's function, and
// exits 0 on success or non-zero on failure.
type InlineTestCase struct {
	Title     string `json:"title"`
	Hidden    bool   `json:"hidden"`
	Position  int    `json:"position"`
	Validator string `json:"validator"`
}

type Submission struct {
	base.BaseModel

	UserID     int64            `json:"user_id" gorm:"not null;index;index:idx_user_problem"`
	ProblemID  int64            `json:"problem_id" gorm:"not null;index;index:idx_user_problem"`
	Language   problem.Language `json:"language" gorm:"size:50;not null"`
	SourceCode string           `json:"source_code" gorm:"type:text;not null"`

	// ChallengeID links to a challenge (nil for problem/playground runs).
	ChallengeID *int64 `json:"challenge_id,omitempty" gorm:"index"`

	// Résultat du jugement
	Verdict Verdict `json:"verdict" gorm:"size:50;default:Pending;index"`
	Message *string `json:"message,omitempty" gorm:"type:text"`

	// Métriques d'exécution
	ExecutionTime *uint32 `json:"execution_time,omitempty"`
	MemoryUsage   *uint32 `json:"memory_usage,omitempty"`

	// Output brut du juge
	JudgeOutput *string `json:"judge_output,omitempty" gorm:"type:text"`

	// Stdin for playground runs (problem_id == 0). Not used for scored submissions.
	Stdin *string `json:"stdin,omitempty" gorm:"type:text"`

	// Set to true when the submission was made during a timed exam.
	IsExamSubmission bool `json:"is_exam_submission" gorm:"default:false"`

	// InlineTestCases is populated for challenge submissions and embedded in the
	// Redis message so the judge can run without querying the DB. Not persisted.
	InlineTestCases []InlineTestCase `json:"inline_test_cases,omitempty" gorm:"-"`

	// Relations
	TestResults []TestCaseResult `json:"test_results,omitempty" gorm:"foreignKey:SubmissionID"`
}

// TableName spécifie le nom de la table
func (Submission) TableName() string {
	return "submissions"
}

// IsAccepted vérifie si la soumission est acceptée
func (s *Submission) IsAccepted() bool {
	return s.Verdict == VerdictAccepted
}

// IsPending vérifie si la soumission est en attente
func (s *Submission) IsPending() bool {
	return s.Verdict == VerdictPending
}

// HasError vérifie si la soumission a une erreur
func (s *Submission) HasError() bool {
	return s.Verdict == VerdictRuntimeError ||
		s.Verdict == VerdictCompilationError ||
		s.Verdict == VerdictInternalError
}

// PassedTestsCount retourne le nombre de tests réussis
func (s *Submission) PassedTestsCount() int {
	count := 0
	for _, tr := range s.TestResults {
		if tr.Verdict == VerdictAccepted {
			count++
		}
	}
	return count
}

// TotalTestsCount retourne le nombre total de tests
func (s *Submission) TotalTestsCount() int {
	return len(s.TestResults)
}
