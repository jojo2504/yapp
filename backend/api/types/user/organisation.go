package user

import "backend/api/types/base"

type Organisation struct {
	base.BaseModel

	Name         string `json:"name" gorm:"size:255;not null"`
	Localisation string `json:"localisation" gorm:"size:255"`

	// Relations
	Users []User `json:"users,omitempty" gorm:"foreignKey:OrganisationID"`
}

// TableName spécifie le nom de la table
func (Organisation) TableName() string {
	return "organisations"
}
