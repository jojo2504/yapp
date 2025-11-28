package main

import (
	"backend/internal/api/judge"
	"backend/internal/api/submit"
	"backend/internal/database"
	"backend/internal/redisService"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
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

func SetupRouter(redis redisService.RedisService) *gin.Engine {
	r := gin.Default()

	r.Use(CORSMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"database": "connected",
			"redis":    "connected",
		})
	})

	// Register routes
	submit.RegisterRoutes(r, redis)
	judge.RegisterRoutes(r)

	return r
}

func main() {
	log.Println("🚀 Starting YAPP Backend...")

	// ============================================
	// 1. Connexion à PostgreSQL
	// ============================================
	dbConfig := database.NewConfigFromEnv()
	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.Close()

	// ============================================
	// 2. Exécuter les migrations
	// ============================================
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("❌ Failed to run migrations: %v", err)
	}

	// ============================================
	// 3. Seed la base de données (dev only)
	// ============================================
	if err := database.SeedDatabase(db); err != nil {
		log.Printf("⚠️  Warning: Failed to seed database: %v", err)
	}

	// ============================================
	// 4. Connexion à Redis
	// ============================================
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "redis"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}

	redis := redisService.RedisService{Context: context.Background()}
	redisService.NewClient(&redis, redisHost+":"+redisPort, "", 0)
	log.Println("✅ Connected to Redis")

	// ============================================
	// 5. Démarrer le serveur HTTP
	// ============================================
	router := SetupRouter(redis)

	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		serverPort = "8080"
	}

	srv := &http.Server{
		Addr:    "0.0.0.0:" + serverPort,
		Handler: router,
	}

	go func() {
		log.Printf("🌐 Server listening on http://0.0.0.0:%s", serverPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Failed to start server: %v", err)
		}
	}()

	// ============================================
	// 6. Graceful shutdown
	// ============================================
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("👋 Server exited properly")
}
