package submission

import (
	"backend/api/types/base"
	"backend/api/types/problem"
)

// InlineTestCase carries a single test case embedded in the Redis submission
// message for challenge submissions. Not stored in the DB (gorm:"-").
type InlineTestCase struct {
	Input    string `json:"input"`
	Expected string `json:"expected"`
	Hidden   bool   `json:"hidden"`
	Position int    `json:"position"`
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
