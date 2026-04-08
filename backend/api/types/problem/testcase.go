package problem

import "backend/api/types/base"

type TestCase struct {
	base.BaseModel

	ProblemID int64  `json:"problem_id" gorm:"not null;index"`
	Input     string `json:"input" gorm:"type:text;not null"`
	Expected  string `json:"expected" gorm:"type:text;not null"`
	Hidden    bool   `json:"hidden" gorm:"default:false"`
	Position  int    `json:"position" gorm:"default:0"`

	// Relations
	Problem *Problem `json:"-" gorm:"foreignKey:ProblemID"`
}

// TableName spécifie le nom de la table
func (TestCase) TableName() string {
	return "test_cases"
}
