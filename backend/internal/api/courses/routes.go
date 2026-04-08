package courses

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	// Read: all authenticated users (students, teachers, admins)
	read := r.Group("/api/courses", middleware.JWTAuth())
	{
		read.GET("", handler.List)
		read.GET("/:id", handler.Get)
	}

	// Write: teachers and admins only
	write := r.Group("/api/courses", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"))
	{
		write.POST("", handler.Create)
		write.PUT("/:id", handler.Update)
		write.DELETE("/:id", handler.Delete)
		write.POST("/:id/assign", handler.AssignGroups)
	}
}
