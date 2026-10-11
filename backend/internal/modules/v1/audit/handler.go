package audit

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
	svc := NewService(db)
	h := &Handler{svc: svc}

	authMid := middleware.Auth(cfg.JWTSecret)
	rg.GET("/audit-logs", authMid, middleware.RBAC(db, "audit", "read"), h.List)
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	moduleFilter := c.Query("module")
	actionFilter := c.Query("action")

	logs, total, err := h.svc.List(p.Offset, p.Limit, moduleFilter, actionFilter)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, logs, p.Page, p.Limit, total)
}
