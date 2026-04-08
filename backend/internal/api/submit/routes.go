package submit

import (
	"backend/internal/api/middleware"
	"backend/internal/redisService"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	Redis redisService.RedisService
	DB    *gorm.DB
}

// RegisterRoutes wires up the submission endpoint.
func RegisterRoutes(r *gin.Engine, redis redisService.RedisService, db *gorm.DB) {
	h := Handler{Redis: redis, DB: db}
	auth := r.Group("", middleware.JWTAuth())
	{
		auth.POST("/api/submit", h.SendSubmission)
		auth.POST("/api/run", h.CreateRun)
		auth.GET("/api/submissions/:id", h.GetSubmission)
	}
}
