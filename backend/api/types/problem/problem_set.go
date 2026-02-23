package problem

import (
	"backend/api/types/base"
	"time"
)

// ProblemSetType represents the kind of problem set.
type ProblemSetType string

const (
	ProblemSetTypeAssignment ProblemSetType = "assignment"
	ProblemSetTypeExam       ProblemSetType = "exam"
	ProblemSetTypePractice   ProblemSetType = "practice"
)

type ProblemSet struct {
	base.BaseModel

	Name           string         `json:"name" gorm:"size:255;not null"`
	Description    *string        `json:"description,omitempty" gorm:"type:text"`
	OrganisationID int64          `json:"organisation_id" gorm:"not null;index"`
	CreatedBy      *int64         `json:"created_by,omitempty" gorm:"index"`
	IsPublished    bool           `json:"is_published" gorm:"default:false"`

	// Exam / timed-set fields
	Type     ProblemSetType `json:"type" gorm:"size:50;not null;default:assignment"`
	StartsAt *time.Time     `json:"starts_at,omitempty"`
	EndsAt   *time.Time     `json:"ends_at,omitempty"`

	// Relations
	Problems    []*Problem             `json:"problems,omitempty" gorm:"many2many:problem_problem_sets"`
	Enrollments []ProblemSetEnrollment `json:"enrollments,omitempty" gorm:"foreignKey:ProblemSetID"`
}

// TableName spécifie le nom de la table
func (ProblemSet) TableName() string {
	return "problem_sets"
}

// ProblemCount retourne le nombre de problèmes
func (ps *ProblemSet) ProblemCount() int {
	return len(ps.Problems)
}

// EnrollmentCount retourne le nombre d'inscrits
func (ps *ProblemSet) EnrollmentCount() int {
	return len(ps.Enrollments)
}
