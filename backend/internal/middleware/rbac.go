package middleware

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/platform/response"
)

type PermissionRecord struct {
	Role      string `gorm:"column:role"`
	Module    string `gorm:"column:module"`
	CanCreate bool   `gorm:"column:can_create"`
	CanRead   bool   `gorm:"column:can_read"`
	CanUpdate bool   `gorm:"column:can_update"`
	CanDelete bool   `gorm:"column:can_delete"`
}

func RBAC(db *gorm.DB, module, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetUserRole(c)
		if role == "" {
			response.Error(c, apperror.Unauthorized("Unauthenticated user"))
			c.Abort()
			return
		}

		if role == "super_admin" {
			c.Next()
			return
		}

		var perm PermissionRecord
		err := db.Table("permissions").
			Where("role = ? AND module = ?", role, module).
			First(&perm).Error

		if err != nil {
			response.Error(c, apperror.Forbidden("No permissions found for this role and module"))
			c.Abort()
			return
		}

		allowed := false
		switch action {
		case "create":
			allowed = perm.CanCreate
		case "read":
			allowed = perm.CanRead
		case "update":
			allowed = perm.CanUpdate
		case "delete":
			allowed = perm.CanDelete
		}

		if !allowed {
			response.Error(c, apperror.Forbidden("You do not have permission to perform this action"))
			c.Abort()
			return
		}

		c.Next()
	}
}

func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetUserRole(c)
		if role == "" {
			response.Error(c, apperror.Unauthorized("Unauthenticated user"))
			c.Abort()
			return
		}

		for _, r := range allowedRoles {
			if r == role {
				c.Next()
				return
			}
		}

		response.Error(c, apperror.Forbidden("You do not have the required role to access this resource"))
		c.Abort()
	}
}
