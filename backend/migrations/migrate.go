package migrations

import (
	"embed"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

//go:embed *.up.sql
var MigrationFiles embed.FS

// RunAutoMigrate applies any pending SQL migrations and ensures default seed data.
func RunAutoMigrate(db *gorm.DB) error {
	// Create migration tracking table if not exists
	err := db.Exec(`
		CREATE TABLE IF NOT EXISTS ptx_schema_migrations (
			filename VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`).Error
	if err != nil {
		return fmt.Errorf("failed to create migration table: %w", err)
	}

	entries, err := MigrationFiles.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read embedded migrations: %w", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		filename := entry.Name()
		var count int64
		db.Table("ptx_schema_migrations").Where("filename = ?", filename).Count(&count)
		if count > 0 {
			continue // Already applied
		}

		content, err := MigrationFiles.ReadFile(filename)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		slog.Info("applying database migration", "file", filename)
		tx := db.Begin()
		if err := tx.Exec(string(content)).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s failed: %w", filename, err)
		}

		if err := tx.Exec("INSERT INTO ptx_schema_migrations (filename) VALUES (?)", filename).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", filename, err)
		}

		if err := tx.Commit().Error; err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", filename, err)
		}
		slog.Info("migration applied successfully", "file", filename)
	}

	// Seed Master Super Admin if not already present
	seedSuperAdmin(db)

	return nil
}

func seedSuperAdmin(db *gorm.DB) {
	email := "owner@patwatoli.example"
	password := "S3cure#Pass"

	var count int64
	db.Table("users").Where("lower(email) = ?", email).Count(&count)
	if count > 0 {
		return // Super admin already exists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("failed to hash default super admin password", "error", err)
		return
	}

	now := time.Now().UTC()
	user := map[string]interface{}{
		"id":            uuid.New().String(),
		"name":          "Patwatoli Super Owner",
		"email":         email,
		"phone":         "9876543210",
		"password_hash": string(hash),
		"role":          "super_admin",
		"is_active":     true,
		"created_at":    now,
		"updated_at":    now,
	}

	if err := db.Table("users").Create(&user).Error; err != nil {
		slog.Error("failed to seed default super admin", "error", err)
	} else {
		slog.Info("default super admin user seeded successfully", "email", email)
	}
}
