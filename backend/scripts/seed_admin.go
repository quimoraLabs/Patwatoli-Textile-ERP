//go:build ignore

package main

import (
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	email := "owner@patwatoli.example"
	password := "S3cure#Pass"

	var count int64
	db.Table("users").Where("lower(email) = ?", email).Count(&count)
	if count > 0 {
		fmt.Printf("User %s already exists. Skipping seed.\n", email)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user := map[string]interface{}{
		"id":            uuid.New(),
		"name":          "Patwatoli Super Admin",
		"email":         email,
		"phone":         "9876543210",
		"password_hash": string(hash),
		"role":          "super_admin",
		"is_active":     true,
	}

	if err := db.Table("users").Create(&user).Error; err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("Successfully created super_admin user: %s\n", email)
}
