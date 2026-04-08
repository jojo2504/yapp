package notification

import (
	"time"

	"gorm.io/gorm"
)

// Notification is an in-app message delivered to a single user.
// Note: no UpdatedAt — only IsRead is mutable via a targeted UPDATE.
type Notification struct {
	ID        int64          `json:"id"         gorm:"primaryKey;autoIncrement"`
	UserID    int64          `json:"user_id"    gorm:"not null;index"`
	Title     string         `json:"title"      gorm:"type:text;not null"`
	Message   string         `json:"message"    gorm:"type:text;not null"`
	IsRead    bool           `json:"is_read"    gorm:"default:false"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	DeletedAt gorm.DeletedAt `json:"-"          gorm:"index"`
}

// TableName maps to the notifications table created in 001_init.sql.
func (Notification) TableName() string {
	return "notifications"
}
