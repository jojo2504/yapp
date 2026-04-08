package course

import "backend/api/types/base"

type Course struct {
	base.BaseModel

	Name         string  `json:"name" gorm:"size:255;not null"`
	Description  string  `json:"description" gorm:"type:text"`
	ChallengeIDs []int64 `json:"challenge_ids" gorm:"serializer:json;column:challenge_ids;type:text"`
	GroupIDs     []int64 `json:"group_ids" gorm:"serializer:json;column:group_ids;type:text"`
	CreatedBy    *int64  `json:"created_by,omitempty" gorm:"index"`
}

func (Course) TableName() string {
	return "courses"
}
