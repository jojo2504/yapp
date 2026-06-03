package database

import (
	"log"
	"os"
	"strings"

	"backend/api/types/challenge"
	"backend/api/types/exam"
	"backend/api/types/group"
	"backend/api/types/submission"

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
        Logger:      logger.Default.LogMode(logger.Info),
        // Add this line to explicitly disable GORM-level statement caching
        PrepareStmt: false,
    })
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db
	log.Println("Database connected successfully")

	// Auto-migrate the models whose schema has evolved since 001_init.sql.
	// GORM's AutoMigrate only *adds* missing columns/indexes — it never drops
	// or rewrites existing ones — so it's safe to run on every boot. It's the
	// pragmatic alternative to hand-rolling a migration file for every model
	// change while the project is still small.
	if err := db.AutoMigrate(
		&challenge.Challenge{},
		&submission.Submission{},
		&exam.Exam{},
		&group.Group{},
	); err != nil {
		log.Printf("WARN: AutoMigrate failed: %v", err)
	} else {
		log.Println("AutoMigrate completed")
	}

	// Two things AutoMigrate can't fix on its own:
	//   1. The FK on submissions.problem_id → problems.id blocks challenge
	//      submissions (they use problem_id = 0 as a "no problem" sentinel).
	//   2. submissions.language was defined as a strict ENUM that doesn't
	//      match the Go enum casing (Cpp vs C++, Javascript vs JavaScript, …).
	//      Converting it to VARCHAR lets both flow through.
	// Both statements are idempotent and survive repeated boots safely.
	fixStmts := []string{
		`ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_problem_id_fkey`,
		`DO $$
		 BEGIN
		     IF EXISTS (
		         SELECT 1
		         FROM information_schema.columns
		         WHERE table_name = 'submissions'
		           AND column_name = 'language'
		           AND data_type = 'USER-DEFINED'
		     ) THEN
		         ALTER TABLE submissions
		             ALTER COLUMN language TYPE VARCHAR(50) USING language::text;
		     END IF;
		 END$$`,
	}
	for _, stmt := range fixStmts {
		if err := db.Exec(stmt).Error; err != nil {
			log.Printf("WARN: schema fix-up failed: %v", err)
		}
	}

	return db
}
