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
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		name := os.Getenv("DB_NAME")
		sslmode := os.Getenv("DB_SSLMODE")
		if sslmode == "" {
			sslmode = "disable"
		}
		dsn = "host=" + host + " port=" + port + " user=" + user + " password=" + password + " dbname=" + name + " sslmode=" + sslmode
	} else {
		// Supabase uses PgBouncer in transaction mode, which does not support
		// prepared statements. prefer_simple_protocol=true disables pgx's
		// prepared-statement cache and prevents SQLSTATE 42P05 errors.
		if !strings.Contains(dsn, "sslmode=") {
			sep := "&"
			if !strings.Contains(dsn, "?") {
				sep = "?"
			}
			dsn += sep + "sslmode=require"
		}
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db
	log.Println("Database connected successfully")

	return db
}
