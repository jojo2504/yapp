package users

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	service := NewService(db)
	handler := NewHandler(service)

	admin := r.Group("/api/admin/users", middleware.JWTAuth(), middleware.RequireRole("Admin"))
	{
		admin.GET("", handler.ListUsers)
		admin.PATCH("/:id", handler.UpdateUser)
		admin.POST("/:id/password", handler.ChangePassword)
		admin.PATCH("/:id/ban", handler.ToggleBan)
		admin.DELETE("/:id", handler.DeleteUser)
	}
}
