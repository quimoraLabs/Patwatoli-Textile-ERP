package report

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
	reportsGroup := rg.Group("/reports", authMid)
	{
		reportsGroup.GET("/sales", middleware.RBAC(db, "reports", "read"), h.SalesReport)
		reportsGroup.GET("/merchant-wise", middleware.RBAC(db, "reports", "read"), h.MerchantWiseReport)
		reportsGroup.GET("/item-wise", middleware.RBAC(db, "reports", "read"), h.ItemWiseReport)
		reportsGroup.GET("/gst", middleware.RBAC(db, "reports", "read"), h.GSTReport)
	}
}

func (h *Handler) SalesReport(c *gin.Context) {
	from := c.Query("from_date")
	to := c.Query("to_date")
	res, err := h.svc.GetSalesReport(from, to)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, res)
}

func (h *Handler) MerchantWiseReport(c *gin.Context) {
	from := c.Query("from_date")
	to := c.Query("to_date")
	res, err := h.svc.GetMerchantWiseReport(from, to)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, res)
}

func (h *Handler) ItemWiseReport(c *gin.Context) {
	from := c.Query("from_date")
	to := c.Query("to_date")
	res, err := h.svc.GetItemWiseReport(from, to)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, res)
}

func (h *Handler) GSTReport(c *gin.Context) {
	from := c.Query("from_date")
	to := c.Query("to_date")
	res, err := h.svc.GetGSTReport(from, to)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, res)
}
