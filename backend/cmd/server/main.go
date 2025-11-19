package main

import (
	"backend/internal/api/judge"
	"backend/internal/api/submit"
	"backend/internal/redisService"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles CORS preflight OPTIONS requests and sets headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set CORS headers for all requests
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		// Continue to next handler
		c.Next()
	}
}

func SetupRouter(redis redisService.RedisService) *gin.Engine {
	r := gin.Default()

	r.Use(CORSMiddleware())

	submit.RegisterRoutes(r, redis)
	judge.RegisterRoutes(r)

	return r
}

func main() {
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, "redis:6379", "", 0)
	println("init redis!")

	router := SetupRouter(redis)
	router.Run("0.0.0.0:8080") // start server once
}
