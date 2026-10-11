package dashboard

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/response"
)

type Handler struct {
	svc *Service
}

func Register(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB) {
	svc := NewService(db)
	h := &Handler{svc: svc}

	authMid := middleware.Auth(cfg.JWTSecret)
	rg.GET("/dashboard", authMid, middleware.RBAC(db, "dashboard", "read"), h.GetMetrics)
}

func (h *Handler) GetMetrics(c *gin.Context) {
	metrics, err := h.svc.GetMetrics()
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, metrics)
}
