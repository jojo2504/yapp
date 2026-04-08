package problems

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	problems := r.Group("/api/problems")
	{
		// Public routes (with optional auth to show/hide test cases)
		problems.GET("", handler.List)
		problems.GET("/:id", middleware.OptionalAuth(), handler.GetByID)

		// Protected routes (Teacher/Admin only)
		problems.POST("", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"), handler.Create)
		problems.PUT("/:id", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"), handler.Update)
		problems.DELETE("/:id", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"), handler.Delete)
	}
}
