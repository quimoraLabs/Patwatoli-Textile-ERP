package backup

import (
	"fmt"
	"net/http"

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
	backupGroup := rg.Group("/backups", authMid)
	{
		backupGroup.GET("", middleware.RBAC(db, "backup", "read"), h.List)
		backupGroup.POST("", middleware.RBAC(db, "backup", "create"), h.TriggerBackup)
		backupGroup.GET("/:id/download", middleware.RBAC(db, "backup", "read"), h.Download)
	}
}

func (h *Handler) List(c *gin.Context) {
	list, err := h.svc.List()
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, list)
}

func (h *Handler) TriggerBackup(c *gin.Context) {
	actorID := middleware.GetUserID(c)
	res, err := h.svc.TriggerBackup(actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, res)
}

func (h *Handler) Download(c *gin.Context) {
	id := c.Param("id")
	data, err := h.svc.GetBackupFile(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	c.Header("Content-Type", "application/sql")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", id))
	c.Data(http.StatusOK, "application/sql", data)
}
