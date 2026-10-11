package setting

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/platform/response"
)

type Handler struct {
	svc *Service
}

func Register(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB) {
	svc := NewService(db)
	h := &Handler{svc: svc}

	authMid := middleware.Auth(cfg.JWTSecret)
	settingsGroup := rg.Group("/settings", authMid)
	{
		settingsGroup.GET("", middleware.RBAC(db, "settings", "read"), h.List)
		settingsGroup.PUT("", middleware.RBAC(db, "settings", "update"), h.Update)
	}
}

func (h *Handler) List(c *gin.Context) {
	settings, err := h.svc.List()
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, settings)
}

func (h *Handler) Update(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid settings update payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	if err := h.svc.UpdateSettings(req, actorID, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Settings updated successfully"})
}
