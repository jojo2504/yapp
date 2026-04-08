package violation

import (
	"time"

	"gorm.io/gorm"
)

// ExamViolation records an integrity violation detected during a timed exam.
// Note: no UpdatedAt — the record is append-only by design.
type ExamViolation struct {
	ID             int64          `json:"id"              gorm:"primaryKey;autoIncrement"`
	UserID         int64          `json:"user_id"         gorm:"not null;index"`
	ProblemSetID   int64          `json:"problem_set_id"  gorm:"not null;index"`
	ViolationType  string         `json:"violation_type"  gorm:"size:50;not null"`
	DurationSeconds *int          `json:"duration_seconds,omitempty"`
	CreatedAt      time.Time      `json:"created_at"      gorm:"autoCreateTime"`
	DeletedAt      gorm.DeletedAt `json:"-"               gorm:"index"`
}

// TableName maps to the exam_violations table created in 001_init.sql.
func (ExamViolation) TableName() string {
	return "exam_violations"
}
