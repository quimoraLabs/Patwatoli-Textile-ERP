package ledger

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/pagination"
	"patwatoli-erp/internal/platform/response"
)

type Handler struct {
	svc *Service
}

func Register(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB) {
	repo := NewRepository(db)
	svc := NewService(repo, db)
	h := &Handler{svc: svc}

	authMid := middleware.Auth(cfg.JWTSecret)
	// Ledger routes under merchants/:id/ledger and /ledger
	rg.GET("/merchants/:id/ledger", authMid, middleware.RBAC(db, "ledger", "read"), h.GetMerchantLedger)
}

func (h *Handler) GetMerchantLedger(c *gin.Context) {
	p := pagination.FromContext(c)
	merchantID := c.Param("id")
	from := c.Query("from_date")
	to := c.Query("to_date")

	ledgerData, total, err := h.svc.GetMerchantLedger(merchantID, p.Offset, p.Limit, from, to)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, ledgerData, p.Page, p.Limit, total)
}
