package invoice

import (
	"fmt"
	"net/http"

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
	invoicesGroup := rg.Group("/invoices", authMid)
	{
		invoicesGroup.GET("", middleware.RBAC(db, "invoices", "read"), h.List)
		invoicesGroup.POST("", middleware.RBAC(db, "invoices", "create"), h.Create)
		invoicesGroup.GET("/:id", middleware.RBAC(db, "invoices", "read"), h.GetByID)
		invoicesGroup.GET("/:id/pdf", middleware.RBAC(db, "invoices", "read"), h.GetPDF)
		invoicesGroup.POST("/:id/cancel", middleware.RBAC(db, "invoices", "update"), h.Cancel)
	}
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	merchantID := c.Query("merchant_id")
	status := c.Query("status")
	from := c.Query("from_date")
	to := c.Query("to_date")

	invoices, total, err := h.svc.List(p.Offset, p.Limit, merchantID, status, from, to)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OKWithMeta(c, invoices, p.Page, p.Limit, total)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid invoice payload: "+err.Error()))
		return
	}

	actorID := middleware.GetUserID(c)
	inv, err := h.svc.Create(req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, inv)
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	inv, err := h.svc.GetByID(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, inv)
}

func (h *Handler) Cancel(c *gin.Context) {
	id := c.Param("id")
	var req CancelInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Cancellation reason is required"))
		return
	}

	actorID := middleware.GetUserID(c)
	inv, err := h.svc.Cancel(id, req, actorID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, inv)
}

func (h *Handler) GetPDF(c *gin.Context) {
	id := c.Param("id")
	pdfBytes, filename, err := h.svc.GeneratePDF(id)
	if err != nil {
		response.Error(c, err)
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
