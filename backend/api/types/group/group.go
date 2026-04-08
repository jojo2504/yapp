package group

import "backend/api/types/base"

type Group struct {
	base.BaseModel

	Name      string   `json:"name" gorm:"size:255;not null"`
	Students  []string `json:"students" gorm:"serializer:json;type:text"`
	CourseIDs []int64  `json:"course_ids" gorm:"serializer:json;column:course_ids;type:text"`
	CreatedBy *int64   `json:"created_by,omitempty" gorm:"index"`
}

func (Group) TableName() string {
	return "groups"
}
