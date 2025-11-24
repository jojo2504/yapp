package submission

import "backend/api/types/base"

type TestCaseResult struct {
	base.BaseModel

	SubmissionID int64   `json:"submission_id" gorm:"not null;index"`
	TestCaseID   int64   `json:"test_case_id" gorm:"not null;index"`
	Verdict      Verdict `json:"verdict" gorm:"size:50;not null"`

	// Métriques
	ExecutionTime uint32 `json:"execution_time"`
	MemoryKB      uint32 `json:"memory_kb"`

	// Output réel
	ActualOutput *string `json:"actual_output,omitempty" gorm:"type:text"`
}

// TableName spécifie le nom de la table
func (TestCaseResult) TableName() string {
	return "test_case_results"
}

// IsAccepted vérifie si ce test case est passé
func (tcr *TestCaseResult) IsAccepted() bool {
	return tcr.Verdict == VerdictAccepted
}
