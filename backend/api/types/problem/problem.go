package problem

import "backend/api/types/base"

type Problem struct {
	base.BaseModel

	Title       string     `json:"title" gorm:"size:255;not null"`
	Description string     `json:"description" gorm:"type:text;not null"`
	Language    Language   `json:"language" gorm:"size:50;not null;index"`
	Difficulty  Difficulty `json:"difficulty" gorm:"size:20;not null;default:easy;index"`

	// Limites d'exécution
	TimeLimit   int `json:"time_limit_ms" gorm:"default:2000"`  // millisecondes
	MemoryLimit int `json:"memory_limit_mb" gorm:"default:256"` // mégaoctets

	// Metadata
	AuthorID *int64  `json:"author_id,omitempty" gorm:"index"`
	Points   *int32  `json:"points" gorm:"default:100"`

	// Code templates
	StarterCode  *string `json:"starter_code,omitempty" gorm:"type:text"`
	SolutionCode *string `json:"-" gorm:"type:text"` // Jamais exposé aux étudiants

	// Relations
	TestCases   []TestCase    `json:"test_cases,omitempty" gorm:"foreignKey:ProblemID"`
	ProblemSets []*ProblemSet `json:"problem_sets,omitempty" gorm:"many2many:problem_problem_sets"`
}

// TableName spécifie le nom de la table
func (Problem) TableName() string {
	return "problems"
}

// GetVisibleTestCases retourne uniquement les test cases visibles
func (p *Problem) GetVisibleTestCases() []TestCase {
	var visible []TestCase
	for _, tc := range p.TestCases {
		if !tc.Hidden {
			visible = append(visible, tc)
		}
	}
	return visible
}

// GetHiddenTestCases retourne uniquement les test cases cachés
func (p *Problem) GetHiddenTestCases() []TestCase {
	var hidden []TestCase
	for _, tc := range p.TestCases {
		if tc.Hidden {
			hidden = append(hidden, tc)
		}
	}
	return hidden
}
