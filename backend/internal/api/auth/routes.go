package auth

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	auth := r.Group("/api/auth")
	{
		// Public routes
		auth.POST("/register", handler.Register)
		auth.POST("/login", handler.Login)
		auth.POST("/refresh", handler.RefreshToken)

		// Protected routes
		auth.GET("/me", middleware.JWTAuth(), handler.GetMe)
		auth.POST("/logout", middleware.JWTAuth(), handler.Logout)

		// Admin-only: create any user (including other admins)
		auth.POST("/admin/register", middleware.JWTAuth(), middleware.RequireRole("Admin"), handler.AdminCreateUser)
	}
}
