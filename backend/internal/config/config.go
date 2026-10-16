package config

import (
	"os"
	"strconv"
	"strings"
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
	loadEnvFiles()

	accessTTL, err := strconv.Atoi(get("JWT_ACCESS_TTL_MIN", "15"))
	if err != nil {
		accessTTL = 15
	}

	refreshTTL, err := strconv.Atoi(get("JWT_REFRESH_TTL_DAY", "7"))
	if err != nil {
		refreshTTL = 7
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = get("ENV", "development")
	}

	origin := os.Getenv("ALLOWED_ORIGIN")
	if origin == "" {
		origin = get("CORS_ORIGINS", "http://localhost:3000")
	}

	return Config{
		Env:           env,
		Port:          get("PORT", "8080"),
		DatabaseURL:   get("DATABASE_URL", "postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable"),
		RedisURL:      get("REDIS_URL", "localhost:6379"),
		JWTSecret:     get("JWT_SECRET", "super-secret-jwt-key-patwatoli-textile-erp-2026"),
		AccessTTLMin:  accessTTL,
		RefreshTTLDay: refreshTTL,
		AllowedOrigin: origin,
	}
}

// loadEnvFiles loads environment variables from local .env files if present.
// It checks .env.local first, then .env. Pre-existing environment variables (e.g. from Render) are never overwritten.
func loadEnvFiles() {
	files := []string{
		".env.local",
		".env",
		"backend/.env.local",
		"backend/.env",
		"../.env.local",
		"../.env",
	}

	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				// Strip surrounding quotes if present
				if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
					val = val[1 : len(val)-1]
				}
				// Set only if not already present in OS environment
				if os.Getenv(key) == "" {
					os.Setenv(key, val)
				}
			}
		}
	}
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
