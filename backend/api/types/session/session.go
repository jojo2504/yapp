package session

import (
    "backend/api/types/base"
    "time"
)

type Session struct {
    base.BaseModel

    UserID    int64     `json:"user_id"`
    Token     string    `json:"token"` // refresh token UUID
    ExpiresAt time.Time `json:"expires_at"`
    CreatedAt time.Time `json:"created_at"`
}
