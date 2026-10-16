package auth

import "time"

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Phone    string `json:"phone,omitempty"`
	Role     string `json:"role,omitempty"` // defaults to 'viewer' or 'accountant'
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	ResetToken  string `json:"reset_token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required,min=2,max=100"`
	Phone string `json:"phone,omitempty"`
}

type DeletionAlert struct {
	IsStandby         bool       `json:"is_standby"`
	ScheduledDeleteAt *time.Time `json:"scheduled_delete_at,omitempty"`
	DaysRemaining     int        `json:"days_remaining"`
	Message           string     `json:"message,omitempty"`
}

type UserDTO struct {
	ID                string         `json:"id"`
	Name              string         `json:"name"`
	Email             string         `json:"email"`
	Phone             string         `json:"phone,omitempty"`
	Role              string         `json:"role"`
	IsActive          bool           `json:"is_active"`
	ScheduledDeleteAt *time.Time     `json:"scheduled_delete_at,omitempty"`
	DeletionStatus    string         `json:"deletion_status"`
	DeletionAlert     *DeletionAlert `json:"deletion_alert,omitempty"`
	LastLogin         *time.Time     `json:"last_login,omitempty"`
}

type AuthResponse struct {
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
	User         UserDTO `json:"user"`
}
