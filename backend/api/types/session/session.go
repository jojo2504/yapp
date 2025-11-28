package session

import (
	"backend/api/types/base"
	"backend/api/types/user"
	"time"
)

type Session struct {
	base.BaseModel

	UserID    int64     `json:"user_id" gorm:"not null;index"`
	Token     string    `json:"token" gorm:"size:255;not null;uniqueIndex"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`

	// Relations
	User *user.User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName spécifie le nom de la table
func (Session) TableName() string {
	return "sessions"
}

// IsExpired vérifie si la session est expirée
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// IsValid vérifie si la session est valide
func (s *Session) IsValid() bool {
	return !s.IsExpired() && s.Token != ""
}
