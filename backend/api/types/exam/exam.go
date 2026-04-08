package exam

import "backend/api/types/base"

// Exam is the DB model for teacher-created exams.
// Questions is stored as a JSON text column.
type Exam struct {
	base.BaseModel
	Title           string      `json:"title" gorm:"size:255;not null"`
	DurationMinutes int         `json:"duration_minutes" gorm:"default:60"`
	StartDatetime   string      `json:"start_datetime" gorm:"size:50"`
	EndDatetime     string      `json:"end_datetime" gorm:"size:50"`
	StudentCount    int         `json:"student_count" gorm:"default:0"`
	Questions       interface{} `json:"questions" gorm:"serializer:json;column:questions;type:text"`
	CreatedBy       *int64      `json:"created_by,omitempty" gorm:"index"`
}

func (Exam) TableName() string { return "exams" }
