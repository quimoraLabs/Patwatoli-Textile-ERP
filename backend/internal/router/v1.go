package router

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/modules/v1/audit"
	"patwatoli-erp/internal/modules/v1/auth"
	"patwatoli-erp/internal/modules/v1/backup"
	"patwatoli-erp/internal/modules/v1/dashboard"
	"patwatoli-erp/internal/modules/v1/invoice"
	"patwatoli-erp/internal/modules/v1/item"
	"patwatoli-erp/internal/modules/v1/ledger"
	"patwatoli-erp/internal/modules/v1/merchant"
	"patwatoli-erp/internal/modules/v1/payment"
	"patwatoli-erp/internal/modules/v1/report"
	"patwatoli-erp/internal/modules/v1/setting"
	"patwatoli-erp/internal/modules/v1/user"
)

func registerV1(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB, rdb *redis.Client) {
	auth.Register(rg, cfg, db)
	user.Register(rg, cfg, db)
	merchant.Register(rg, cfg, db)
	item.Register(rg, cfg, db)
	invoice.Register(rg, cfg, db)
	payment.Register(rg, cfg, db)
	ledger.Register(rg, cfg, db)
	dashboard.Register(rg, cfg, db)
	report.Register(rg, cfg, db)
	setting.Register(rg, cfg, db)
	audit.Register(rg, cfg, db)
	backup.Register(rg, cfg, db)
}
