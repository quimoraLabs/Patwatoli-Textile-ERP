package item

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

	authMid := middleware.Auth(cfg.JWTSecret)

	itemsGroup := rg.Group("/items", authMid)
	{
		itemsGroup.GET("", middleware.RBAC(db, "items", "read"), h.List)
		itemsGroup.POST("", middleware.RBAC(db, "items", "create"), h.Create)
		itemsGroup.GET("/:id", middleware.RBAC(db, "items", "read"), h.GetByID)
		itemsGroup.PUT("/:id", middleware.RBAC(db, "items", "update"), h.Update)
		itemsGroup.DELETE("/:id", middleware.RBAC(db, "items", "delete"), h.Delete)
		itemsGroup.POST("/:id/variants", middleware.RBAC(db, "items", "create"), h.AddVariant)
	}

	variantsGroup := rg.Group("/variants", authMid)
	{
		variantsGroup.PUT("/:id", middleware.RBAC(db, "items", "update"), h.UpdateVariant)
		variantsGroup.DELETE("/:id", middleware.RBAC(db, "items", "delete"), h.DeleteVariant)
	}
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	search := c.Query("search")
	items, total, err := h.svc.List(p.Offset, p.Limit, search)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, items, p.Page, p.Limit, total)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid item payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	item, err := h.svc.Create(req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, item)
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	item, err := h.svc.GetByID(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, item)
}

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid item update payload"))
		return
	}

	actorID := middleware.GetUserID(c)
	item, err := h.svc.Update(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, item)
}

func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetUserID(c)
	if err := h.svc.Delete(id, actorID, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Item deleted successfully"})
}

func (h *Handler) AddVariant(c *gin.Context) {
	id := c.Param("id")
	var req AddVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid variant payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	variant, err := h.svc.AddVariant(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, variant)
}

func (h *Handler) UpdateVariant(c *gin.Context) {
	id := c.Param("id")
	var req UpdateVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid variant update payload"))
		return
	}

	actorID := middleware.GetUserID(c)
	variant, err := h.svc.UpdateVariant(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, variant)
}

func (h *Handler) DeleteVariant(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetUserID(c)
	if err := h.svc.DeleteVariant(id, actorID, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Variant deleted successfully"})
}
