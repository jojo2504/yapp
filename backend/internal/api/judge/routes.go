package judge

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	r.POST("/api/result", SendResult)
	r.GET("/api/result", Test)
}
