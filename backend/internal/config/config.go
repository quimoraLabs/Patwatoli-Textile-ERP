package config

import (
	"os"
	"strconv"
)

type Config struct {
	Env           string
	Port          string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	AccessTTLMin  int
	RefreshTTLDay int
	AllowedOrigin string
}

func Load() Config {
	accessTTL, err := strconv.Atoi(get("JWT_ACCESS_TTL_MIN", "15"))
	if err != nil {
		accessTTL = 15
	}

	refreshTTL, err := strconv.Atoi(get("JWT_REFRESH_TTL_DAY", "7"))
	if err != nil {
		refreshTTL = 7
	}

	return Config{
		Env:           get("APP_ENV", "development"),
		Port:          get("PORT", "8080"),
		DatabaseURL:   get("DATABASE_URL", "postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable"),
		RedisURL:      get("REDIS_URL", "localhost:6379"),
		JWTSecret:     get("JWT_SECRET", "super-secret-jwt-key-patwatoli-textile-erp-2026"),
		AccessTTLMin:  accessTTL,
		RefreshTTLDay: refreshTTL,
		AllowedOrigin: get("ALLOWED_ORIGIN", "http://localhost:3000"),
	}
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
