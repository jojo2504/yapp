package base

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel contient les champs communs à tous les modèles
type BaseModel struct {
	ID        int64          `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"` // Soft delete (optionnel)
}
