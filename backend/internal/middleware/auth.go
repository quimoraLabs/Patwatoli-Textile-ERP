package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/platform/response"
)

type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenString = parts[1]
			}
		}

		// Fallback to ?token= query parameter (useful for PDF stream downloads / window.open in browser)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			response.Error(c, apperror.Unauthorized("Missing authorization token"))
			c.Abort()
			return
		}

		claims := &UserClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, apperror.Unauthorized("Unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			response.Error(c, apperror.Unauthorized("Invalid or expired token"))
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

func GetUserID(c *gin.Context) string {
	val, _ := c.Get("user_id")
	if str, ok := val.(string); ok {
		return str
	}
	return ""
}

func GetUserRole(c *gin.Context) string {
	val, _ := c.Get("user_role")
	if str, ok := val.(string); ok {
		return str
	}
	return ""
}
