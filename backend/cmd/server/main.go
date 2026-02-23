package main

import (
	"backend/internal/api/auth"
	"backend/internal/api/health"
	"backend/internal/api/judge"
	"backend/internal/api/submit"
	"backend/internal/database"
	"backend/internal/redisService"
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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
	health.RegisterRoutes(r, db)
	auth.RegisterRoutes(r, db)
	submit.RegisterRoutes(r, redis)
	judge.RegisterRoutes(r)

	return r
}

func main() {
	// Load (and override) environment from .env in the working directory
	if err := godotenv.Overload(".env"); err != nil {
		log.Println("Warning: could not load .env file:", err)
	}

	// Confirm SUPABASE_DB_URL was picked up
	dbURL := os.Getenv("SUPABASE_DB_URL")
	preview := dbURL
	if len(preview) > 100 {
		preview = preview[:30]
	}
	log.Printf("SUPABASE_DB_URL (first 30 chars): %s", preview)

	// Connect to database
	db := database.Connect()

	// Connect to Redis
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, "redis:6379", "", 0)
	println("init redis!")

	router := SetupRouter(db, redis)
	router.Run("0.0.0.0:8080")
}