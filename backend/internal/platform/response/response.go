package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"patwatoli-erp/internal/platform/apperror"
)

type Meta struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorEnvelope struct {
	Code    string                `json:"code"`
	Message string                `json:"message"`
	Details []apperror.FieldError `json:"details,omitempty"`
}

type FailureResponse struct {
	Success bool          `json:"success"`
	Error   ErrorEnvelope `json:"error"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Data:    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, SuccessResponse{
		Success: true,
		Data:    data,
	})
}

func OKWithMeta(c *gin.Context, data interface{}, page, limit int, total int64) {
	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

func Error(c *gin.Context, err error) {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErr.HTTPStatus, FailureResponse{
			Success: false,
			Error: ErrorEnvelope{
				Code:    appErr.Code,
				Message: appErr.Message,
				Details: appErr.Details,
			},
		})
		return
	}

	c.JSON(http.StatusInternalServerError, FailureResponse{
		Success: false,
		Error: ErrorEnvelope{
			Code:    "INTERNAL_ERROR",
			Message: "An unexpected error occurred",
		},
	})
}
