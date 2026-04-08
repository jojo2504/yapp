package main

import (
	"backend/internal/api/auth"
	"backend/internal/api/challenges"
	"backend/internal/api/courses"
	"backend/internal/api/exams"
	"backend/internal/api/groups"
	"backend/internal/api/health"
	"backend/internal/api/judge"
	"backend/internal/api/problems"
	"backend/internal/api/stats"
	"backend/internal/api/submit"
	"backend/internal/api/users"
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
	problems.RegisterRoutes(r, db)
	submit.RegisterRoutes(r, redis, db)
	judge.RegisterRoutes(r, db)
	challenges.RegisterRoutes(r, db, redis)
	groups.RegisterRoutes(r, db)
	courses.RegisterRoutes(r, db)
	exams.RegisterRoutes(r, db)
	stats.RegisterRoutes(r, db)
	users.RegisterRoutes(r, db)

	return r
}

func main() {
	// Load environment from .env — try current dir first, then parent (for local dev outside Docker)
	if err := godotenv.Overload(".env"); err != nil {
		if err2 := godotenv.Overload("../.env"); err2 != nil {
			log.Println("Warning: could not load .env file:", err)
		}
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
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "redis"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	var redis = redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, redisHost+":"+redisPort, "", 0)
	println("init redis!")

	router := SetupRouter(db, redis)
	router.Run("0.0.0.0:8080")
}
