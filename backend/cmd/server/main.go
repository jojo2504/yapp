package main

import (
	"backend/internal/api/auth"
	"backend/internal/api/judge"
	"backend/internal/api/submit"
	"backend/internal/database"
	"backend/internal/redisService"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CORSMiddleware handles CORS preflight OPTIONS requests and sets headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func SetupRouter(db *gorm.DB, redis redisService.RedisService) *gin.Engine {
	r := gin.Default()

	r.Use(CORSMiddleware())

	// Register routes
	auth.RegisterRoutes(r, db)
	submit.RegisterRoutes(r, redis)
	judge.RegisterRoutes(r)

	return r
}

func main() {
	// Connect to database
	db := database.Connect()

	// Connect to Redis
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, "redis:6379", "", 0)
	println("init redis!")

	router := SetupRouter(db, redis)
	router.Run("0.0.0.0:8080")
}