package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB est l'instance globale de la base de données
var DB *gorm.DB

// Config contient la configuration de la base de données
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewConfigFromEnv crée une configuration depuis les variables d'environnement
func NewConfigFromEnv() Config {
	return Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "user"),
		Password: getEnv("DB_PASSWORD", "password"),
		DBName:   getEnv("DB_NAME", "yapp"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

// DSN retourne la chaîne de connexion PostgreSQL
func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

// Connect établit la connexion à la base de données
func Connect(config Config) (*gorm.DB, error) {
	// Configuration du logger GORM
	logLevel := logger.Info
	if os.Getenv("ENV") == "production" {
		logLevel = logger.Warn
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	// Connexion à PostgreSQL
	db, err := gorm.Open(postgres.Open(config.DSN()), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configuration du pool de connexions
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println("✅ Connected to PostgreSQL database")

	return db, nil
}

// Close ferme la connexion à la base de données
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// GetDB retourne l'instance de la base de données
func GetDB() *gorm.DB {
	return DB
}

// Helper pour les variables d'environnement
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
