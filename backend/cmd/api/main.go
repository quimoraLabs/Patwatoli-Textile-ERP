package main

import (
	"log/slog"
	"os"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/platform/cache"
	"patwatoli-erp/internal/platform/database"
	"patwatoli-erp/internal/platform/logger"
	"patwatoli-erp/internal/router"
)

func main() {
	cfg := config.Load()
	logger.Init(cfg.Env)

	slog.Info("initializing Patwatoli Textile ERP backend", "env", cfg.Env)

	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}

	// Redis is optional: system continues safely if Redis is unavailable
	rdb := cache.NewRedis(cfg.RedisURL)

	r := router.New(cfg, db, rdb)

	slog.Info("server starting", "port", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server stopped with error", "error", err)
		os.Exit(1)
	}
}
