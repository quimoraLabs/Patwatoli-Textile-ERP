package router

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
)

func New(cfg config.Config, db *gorm.DB, rdb *redis.Client) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(
		gin.Recovery(),
		middleware.RequestID(),
		middleware.Logger(),
		middleware.CORS(cfg.AllowedOrigin),
	)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"app":    "Patwatoli Textile ERP",
			"env":    cfg.Env,
		})
	})

	registerV1(r.Group("/api/v1"), cfg, db, rdb)
	registerV2(r.Group("/api/v2"), cfg, db, rdb)

	return r
}
