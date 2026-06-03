package judge

import (
	"backend/internal/redisService"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	DB    *gorm.DB
	Redis redisService.RedisService
}

// RegisterRoutes wires up the judge-result endpoints.
// The URL /api/result is kept unchanged to preserve the judge-facing API contract.
func RegisterRoutes(r *gin.Engine, db *gorm.DB, redis redisService.RedisService) {
	h := &Handler{DB: db, Redis: redis}
	r.POST("/api/result", h.SendResult)
	r.GET("/api/result", h.Test)
	r.GET("/api/judge/testcases/:problem_id", h.GetTestCases)
}
