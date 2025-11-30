package problem

import (
	"backend/api/types/base"
	"time"
)

// ProblemSetEnrollment représente l'inscription d'un étudiant à un ProblemSet
type ProblemSetEnrollment struct {
	base.BaseModel

	UserID       int64     `json:"user_id" gorm:"not null;uniqueIndex:idx_enrollment"`
	ProblemSetID int64     `json:"problem_set_id" gorm:"not null;uniqueIndex:idx_enrollment;index"`
	EnrolledAt   time.Time `json:"enrolled_at" gorm:"autoCreateTime"`

	// Relations
	ProblemSet *ProblemSet `json:"problem_set,omitempty" gorm:"foreignKey:ProblemSetID"`
}

// TableName spécifie le nom de la table
func (ProblemSetEnrollment) TableName() string {
	return "problem_set_enrollments"
}
