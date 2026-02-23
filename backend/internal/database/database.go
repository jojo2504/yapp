package database

import (
	"log"
	"os"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() *gorm.DB {
	dsn := os.Getenv("SUPABASE_DB_URL")
	if dsn == "" {
		log.Fatal("SUPABASE_DB_URL environment variable is not set")
	}

	if !strings.Contains(dsn, "sslmode=") {
		if strings.Contains(dsn, "?") {
			dsn += "&sslmode=require"
		} else {
			dsn += "?sslmode=require"
		}
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db
	log.Println("Database connected successfully")

	return db
}
