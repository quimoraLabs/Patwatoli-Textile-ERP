package auth

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
	db  *gorm.DB
}

func Register(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB) {
	svc := NewService(db, cfg)
	h := &Handler{svc: svc, db: db}

	rg.POST("/auth/login", h.Login)
	rg.POST("/auth/register", h.Register)
	rg.POST("/auth/forgot-password", h.ForgotPassword)
	rg.POST("/auth/reset-password", h.ResetPassword)
	rg.POST("/auth/refresh", h.Refresh)

	// Protected auth routes
	protected := rg.Group("/auth", middleware.Auth(cfg.JWTSecret))
	{
		protected.POST("/logout", h.Logout)
		protected.GET("/me", h.Me)
		protected.PUT("/profile", h.UpdateProfile)
		protected.PUT("/change-password", h.ChangePassword)
		protected.POST("/revoke-deletion", h.RevokeDeletion)
	}
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid email or password parameters"))
		return
	}

	res, err := h.svc.Login(req, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, res)
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Refresh token is required"))
		return
	}

	res, err := h.svc.Refresh(req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, res)
}

func (h *Handler) Logout(c *gin.Context) {
	userID := middleware.GetUserID(c)
	middleware.LogAudit(h.db, &userID, "logout", "auth", nil, nil, nil, c.ClientIP())
	response.OK(c, gin.H{"message": "Logged out successfully"})
}

func (h *Handler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.svc.Me(userID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, user)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid registration payload: "+err.Error()))
		return
	}

	res, err := h.svc.Register(req, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, res)
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid email payload"))
		return
	}

	token, err := h.svc.ForgotPassword(req, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{
		"message":     "Password reset token generated successfully",
		"reset_token": token,
	})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid reset password payload: "+err.Error()))
		return
	}

	if err := h.svc.ResetPassword(req, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Password has been reset successfully. You can now log in."})
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid profile update payload: "+err.Error()))
		return
	}

	userID := middleware.GetUserID(c)
	user, err := h.svc.UpdateProfile(userID, req, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, user)
}

func (h *Handler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.BadRequest("Invalid password payload"))
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.ChangePassword(userID, req, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{"message": "Password changed successfully"})
}

func (h *Handler) RevokeDeletion(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.svc.RevokeDeletion(userID, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, gin.H{
		"message": "Account deletion request has been revoked successfully. Your account is fully active.",
		"user":    user,
	})
}
