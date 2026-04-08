package groups

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	read := r.Group("/api/groups", middleware.JWTAuth())
	{
		read.GET("", handler.List)
		read.GET("/:id", handler.Get)
	}

	write := r.Group("/api/groups", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"))
	{
		write.POST("", handler.Create)
		write.PUT("/:id", handler.Update)
		write.DELETE("/:id", handler.Delete)
	}
}
