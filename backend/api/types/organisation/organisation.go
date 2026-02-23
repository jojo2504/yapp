package organisation

import "backend/api/types/base"

type Organisation struct {
	base.BaseModel

	Name   string `json:"name" gorm:"size:255;not null"`
	Domain string `json:"domain" gorm:"size:255;not null"`
}

func (Organisation) TableName() string {
	return "organisations"
}
