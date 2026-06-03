package exams

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	read := r.Group("/api/exams", middleware.JWTAuth())
	{
		read.GET("", handler.List)
		read.GET("/upcoming", handler.Upcoming)
		read.GET("/:id", handler.Get)
	}

	write := r.Group("/api/exams", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"))
	{
		write.POST("", handler.Create)
		write.PUT("/:id", handler.Update)
		write.POST("/:id/stop", handler.Stop)
		write.POST("/:id/restart", handler.Restart)
		write.DELETE("/:id", handler.Delete)
	}
}
