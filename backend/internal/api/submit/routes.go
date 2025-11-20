package submit

import (
    "backend/internal/redisService"

    "github.com/gin-gonic/gin"
)

type Handler struct {
    Redis redisService.RedisService
}

// Init submit endpoint
func RegisterRoutes(r *gin.Engine, redis redisService.RedisService) {
    h := Handler{Redis: redis}

    r.POST("/api/submit", h.SendSubmission)
}
