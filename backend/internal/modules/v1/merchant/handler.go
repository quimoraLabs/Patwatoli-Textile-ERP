package merchant

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
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

	merchantsGroup := rg.Group("/merchants", middleware.Auth(cfg.JWTSecret))
	{
		merchantsGroup.GET("", middleware.RBAC(db, "merchants", "read"), h.List)
		merchantsGroup.POST("", middleware.RBAC(db, "merchants", "create"), h.Create)
		merchantsGroup.GET("/:id", middleware.RBAC(db, "merchants", "read"), h.GetByID)
		merchantsGroup.PUT("/:id", middleware.RBAC(db, "merchants", "update"), h.Update)
		merchantsGroup.DELETE("/:id", middleware.RBAC(db, "merchants", "delete"), h.Delete)
	}
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	search := c.Query("search")
	merchants, total, err := h.svc.List(p.Offset, p.Limit, search)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, merchants, p.Page, p.Limit, total)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid merchant payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	merchant, err := h.svc.Create(req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, merchant)
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	merchant, err := h.svc.GetByID(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, merchant)
}

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid merchant update payload"))
		return
	}

	actorID := middleware.GetUserID(c)
	merchant, err := h.svc.Update(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, merchant)
}

func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetUserID(c)
	if err := h.svc.Delete(id, actorID, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Merchant deleted successfully"})
}
