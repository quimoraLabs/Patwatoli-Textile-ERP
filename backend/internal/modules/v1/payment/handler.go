package payment

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
	paymentsGroup := rg.Group("/payments", authMid)
	{
		paymentsGroup.GET("", middleware.RBAC(db, "payments", "read"), h.List)
		paymentsGroup.POST("", middleware.RBAC(db, "payments", "create"), h.Create)
		paymentsGroup.GET("/:id", middleware.RBAC(db, "payments", "read"), h.GetByID)
	}
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	merchantID := c.Query("merchant_id")
	from := c.Query("from_date")
	to := c.Query("to_date")

	payments, total, err := h.svc.List(p.Offset, p.Limit, merchantID, from, to)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, payments, p.Page, p.Limit, total)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid payment payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	payment, err := h.svc.Create(req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, payment)
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	payment, err := h.svc.GetByID(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, payment)
}
