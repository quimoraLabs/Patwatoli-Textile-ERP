package router

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
)

// registerV2 is a placeholder for V2 (Supply chain & labour) modules.
func registerV2(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB, rdb *redis.Client) {
	rg.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": "v2", "status": "planned"})
	})
}
