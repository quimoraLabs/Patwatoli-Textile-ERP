package user

import (
	"fmt"
	"math"
	"time"
)

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email,max=150"`
	Phone    string `json:"phone,omitempty" binding:"omitempty,max=15"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=super_admin admin accountant viewer"`
}

type UpdateUserRequest struct {
	Name     *string `json:"name,omitempty" binding:"omitempty,max=100"`
	Phone    *string `json:"phone,omitempty" binding:"omitempty,max=15"`
	Password *string `json:"password,omitempty" binding:"omitempty,min=6"`
	Role     *string `json:"role,omitempty" binding:"omitempty,oneof=super_admin admin accountant viewer"`
	IsActive *bool   `json:"is_active,omitempty"`
}

type DeletionAlert struct {
	IsStandby         bool       `json:"is_standby"`
	ScheduledDeleteAt *time.Time `json:"scheduled_delete_at,omitempty"`
	DaysRemaining     int        `json:"days_remaining"`
	Message           string     `json:"message,omitempty"`
}

type UserResponse struct {
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
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

func ToResponse(u *User) UserResponse {
	status := u.DeletionStatus
	if status == "" {
		status = "active"
	}

	var alert *DeletionAlert
	if status == "standby_deletion" && u.ScheduledDeleteAt != nil {
		daysRemaining := int(math.Ceil(time.Until(*u.ScheduledDeleteAt).Hours() / 24))
		if daysRemaining < 0 {
			daysRemaining = 0
		}
		alert = &DeletionAlert{
			IsStandby:         true,
			ScheduledDeleteAt: u.ScheduledDeleteAt,
			DaysRemaining:     daysRemaining,
			Message:           fmt.Sprintf("Your account has been scheduled for deletion by an administrator. Standby validity expires in %d days. You can revoke this deletion to keep your account active.", daysRemaining),
		}
	}

	return UserResponse{
		ID:                u.ID.String(),
		Name:              u.Name,
		Email:             u.Email,
		Phone:             u.Phone,
		Role:              u.Role,
		IsActive:          u.IsActive,
		ScheduledDeleteAt: u.ScheduledDeleteAt,
		DeletionStatus:    status,
		DeletionAlert:     alert,
		LastLogin:         u.LastLogin,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
	}
}
