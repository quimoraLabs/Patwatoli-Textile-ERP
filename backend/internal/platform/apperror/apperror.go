package apperror

import "net/http"

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type AppError struct {
	HTTPStatus int          `json:"-"`
	Code       string       `json:"code"`
	Message    string       `json:"message"`
	Details    []FieldError `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return e.Message
}

func New(httpStatus int, code, message string) *AppError {
	return &AppError{
		HTTPStatus: httpStatus,
		Code:       code,
		Message:    message,
	}
}

func BadRequest(message string, details ...FieldError) *AppError {
	return &AppError{
		HTTPStatus: http.StatusBadRequest,
		Code:       "VALIDATION_ERROR",
		Message:    message,
		Details:    details,
	}
}

func Unauthorized(message string) *AppError {
	if message == "" {
		message = "Unauthorized"
	}
	return &AppError{
		HTTPStatus: http.StatusUnauthorized,
		Code:       "UNAUTHORIZED",
		Message:    message,
	}
}

func Forbidden(message string) *AppError {
	if message == "" {
		message = "Access forbidden"
	}
	return &AppError{
		HTTPStatus: http.StatusForbidden,
		Code:       "FORBIDDEN",
		Message:    message,
	}
}

func NotFound(message string) *AppError {
	if message == "" {
		message = "Resource not found"
	}
	return &AppError{
		HTTPStatus: http.StatusNotFound,
		Code:       "NOT_FOUND",
		Message:    message,
	}
}

func Conflict(message string) *AppError {
	return &AppError{
		HTTPStatus: http.StatusConflict,
		Code:       "CONFLICT",
		Message:    message,
	}
}

func Internal(message string) *AppError {
	if message == "" {
		message = "Internal server error"
	}
	return &AppError{
		HTTPStatus: http.StatusInternalServerError,
		Code:       "INTERNAL_ERROR",
		Message:    message,
	}
}
