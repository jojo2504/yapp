package challenge

import "backend/api/types/base"

// Challenge is the DB model for teacher-created coding challenges.
// StarterCode and TestCases are stored as JSON text columns.
type Challenge struct {
	base.BaseModel
	Title       string      `json:"title" gorm:"size:255;not null"`
	Description string      `json:"description" gorm:"type:text"`
	Difficulty  string      `json:"difficulty" gorm:"size:20;not null;default:'Easy'"`
	Category    string      `json:"category" gorm:"size:100"`
	StarterCode interface{} `json:"starter_code" gorm:"serializer:json;column:starter_code;type:text"`
	TestCases   interface{} `json:"test_cases" gorm:"serializer:json;column:test_cases;type:text"`
	CreatedBy   *int64      `json:"created_by,omitempty" gorm:"index"`
}

func (Challenge) TableName() string { return "challenges" }
