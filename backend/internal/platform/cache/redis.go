package cache

import (
	"context"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedis(addr string) *redis.Client {
	if addr == "" {
		slog.Info("redis not configured, running without redis cache")
		return nil
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Warn("redis ping failed, continuing without redis", "error", err)
		return nil
	}

	slog.Info("connected to Redis successfully")
	return rdb
}
