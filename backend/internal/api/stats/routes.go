package stats

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	h := NewHandler(db)
	r.GET("/api/stats", middleware.JWTAuth(), middleware.RequireRole("Teacher", "Admin"), h.GetStats)
	r.GET("/api/stats/student", middleware.JWTAuth(), middleware.RequireRole("Student"), h.GetStudentStats)
}
