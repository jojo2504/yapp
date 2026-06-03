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
	GroupIDs        []int64     `json:"group_ids" gorm:"serializer:json;column:group_ids;type:text"`
	Questions       interface{} `json:"questions" gorm:"serializer:json;column:questions;type:text"`
	// StatusOverride lets an admin/owner force the exam state regardless of the
	// scheduled window: "" = auto (time-based), "active" = force open, "stopped"
	// = force closed.
	StatusOverride string `json:"status_override" gorm:"size:20"`
	CreatedBy      *int64 `json:"created_by,omitempty" gorm:"index"`
}

func (Exam) TableName() string { return "exams" }
