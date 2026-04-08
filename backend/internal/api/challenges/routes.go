package challenges

import (
	"backend/internal/api/middleware"
	"backend/internal/redisService"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB, redis redisService.RedisService) {
	service := NewService(db)
	handler := NewHandler(service, redis)

	// Read + submit: all authenticated users (students, teachers, admins)
	read := r.Group("/api/challenges", middleware.JWTAuth())
	{
		read.GET("", handler.List)
		read.GET("/:id", handler.Get)
		read.POST("/:id/submit", handler.Submit)
	}

	// Write: teachers and admins only
	write := r.Group("/api/challenges", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"))
	{
		write.POST("", handler.Create)
		write.PUT("/:id", handler.Update)
		write.DELETE("/:id", handler.Delete)
	}
}
