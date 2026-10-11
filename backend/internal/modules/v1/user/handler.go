package user

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

	usersGroup := rg.Group("/users", middleware.Auth(cfg.JWTSecret))
	{
		usersGroup.GET("", middleware.RBAC(db, "users", "read"), h.List)
		usersGroup.POST("", middleware.RBAC(db, "users", "create"), h.Create)
		usersGroup.GET("/:id", middleware.RBAC(db, "users", "read"), h.GetByID)
		usersGroup.PUT("/:id", middleware.RBAC(db, "users", "update"), h.Update)
		usersGroup.DELETE("/:id", middleware.RBAC(db, "users", "delete"), h.Delete)
	}
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	users, total, err := h.svc.List(p.Offset, p.Limit)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, users, p.Page, p.Limit, total)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid user payload", apperror.FieldError{Field: "body", Message: err.Error()}))
		return
	}

	actorID := middleware.GetUserID(c)
	user, err := h.svc.Create(req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, user)
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	user, err := h.svc.GetByID(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, user)
}

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid user update payload"))
		return
	}

	actorID := middleware.GetUserID(c)
	user, err := h.svc.Update(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, user)
}

func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := middleware.GetUserID(c)
	if err := h.svc.Delete(id, actorID, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "User deleted successfully"})
}
