package auth

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
)

type UserEntity struct {
	ID                string     `gorm:"type:uuid;primaryKey"`
	Name              string     `gorm:"column:name"`
	Email             string     `gorm:"column:email"`
	Phone             string     `gorm:"column:phone"`
	PasswordHash      string     `gorm:"column:password_hash"`
	Role              string     `gorm:"column:role"`
	IsActive          bool       `gorm:"column:is_active"`
	ScheduledDeleteAt *time.Time `gorm:"column:scheduled_delete_at"`
	DeletionStatus    string     `gorm:"column:deletion_status"`
	LastLogin         *time.Time `gorm:"column:last_login"`
	CreatedAt         time.Time  `gorm:"column:created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at"`
}

func (UserEntity) TableName() string {
	return "users"
}

func toUserDTO(user UserEntity) UserDTO {
	status := user.DeletionStatus
	if status == "" {
		status = "active"
	}

	var alert *DeletionAlert
	if status == "standby_deletion" && user.ScheduledDeleteAt != nil {
		daysRemaining := int(math.Ceil(time.Until(*user.ScheduledDeleteAt).Hours() / 24))
		if daysRemaining < 0 {
			daysRemaining = 0
		}
		alert = &DeletionAlert{
			IsStandby:         true,
			ScheduledDeleteAt: user.ScheduledDeleteAt,
			DaysRemaining:     daysRemaining,
			Message:           fmt.Sprintf("Your account has been scheduled for deletion by an administrator. Standby validity expires in %d days. You can revoke this deletion to keep your account active.", daysRemaining),
		}
	}

	return UserDTO{
		ID:                user.ID,
		Name:              user.Name,
		Email:             user.Email,
		Phone:             user.Phone,
		Role:              user.Role,
		IsActive:          user.IsActive,
		ScheduledDeleteAt: user.ScheduledDeleteAt,
		DeletionStatus:    status,
		DeletionAlert:     alert,
		LastLogin:         user.LastLogin,
	}
}

type Service struct {
	db  *gorm.DB
	cfg config.Config
}

func NewService(db *gorm.DB, cfg config.Config) *Service {
	return &Service{db: db, cfg: cfg}
}

func (s *Service) Login(req LoginRequest, clientIP string) (*AuthResponse, error) {
	var user UserEntity
	err := s.db.Where("lower(email) = ?", strings.ToLower(req.Email)).First(&user).Error
	if err != nil {
		return nil, apperror.Unauthorized("Invalid email or password")
	}

	if !user.IsActive && user.DeletionStatus != "standby_deletion" {
		return nil, apperror.Forbidden("User account is inactive. Please contact administrator.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, apperror.Unauthorized("Invalid email or password")
	}

	now := time.Now().UTC()
	user.LastLogin = &now
	s.db.Model(&user).Update("last_login", now)

	accessToken, err := s.generateToken(user, time.Duration(s.cfg.AccessTTLMin)*time.Minute, "access")
	if err != nil {
		return nil, apperror.Internal("Failed to generate access token")
	}

	refreshToken, err := s.generateToken(user, time.Duration(s.cfg.RefreshTTLDay)*24*time.Hour, "refresh")
	if err != nil {
		return nil, apperror.Internal("Failed to generate refresh token")
	}

	middleware.LogAudit(s.db, &user.ID, "login", "auth", &user.ID, nil, map[string]string{"email": user.Email}, clientIP)

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         toUserDTO(user),
	}, nil
}

func (s *Service) Refresh(req RefreshRequest) (*AuthResponse, error) {
	claims := &middleware.UserClaims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, apperror.Unauthorized("Invalid or expired refresh token")
	}

	var user UserEntity
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return nil, apperror.Unauthorized("User not found")
	}

	if !user.IsActive && user.DeletionStatus != "standby_deletion" {
		return nil, apperror.Forbidden("User account is deactivated")
	}

	accessToken, err := s.generateToken(user, time.Duration(s.cfg.AccessTTLMin)*time.Minute, "access")
	if err != nil {
		return nil, apperror.Internal("Failed to generate access token")
	}

	refreshToken, err := s.generateToken(user, time.Duration(s.cfg.RefreshTTLDay)*24*time.Hour, "refresh")
	if err != nil {
		return nil, apperror.Internal("Failed to generate refresh token")
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         toUserDTO(user),
	}, nil
}

func (s *Service) Me(userID string) (*UserDTO, error) {
	var user UserEntity
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, apperror.NotFound("User profile not found")
	}

	dto := toUserDTO(user)
	return &dto, nil
}

func (s *Service) RevokeDeletion(userID string, clientIP string) (*UserDTO, error) {
	var user UserEntity
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, apperror.NotFound("User profile not found")
	}

	if user.DeletionStatus != "standby_deletion" {
		return nil, apperror.BadRequest("Your account is not currently scheduled for deletion")
	}

	oldDTO := toUserDTO(user)
	user.DeletionStatus = "active"
	user.ScheduledDeleteAt = nil
	user.IsActive = true

	if err := s.db.Save(&user).Error; err != nil {
		return nil, apperror.Internal("Failed to revoke account deletion")
	}

	newDTO := toUserDTO(user)
	middleware.LogAudit(s.db, &user.ID, "revoke_delete", "auth", &user.ID, oldDTO, newDTO, clientIP)

	return &newDTO, nil
}

func (s *Service) Register(req RegisterRequest, clientIP string) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	var count int64
	s.db.Model(&UserEntity{}).Where("lower(email) = ?", email).Count(&count)
	if count > 0 {
		return nil, apperror.Conflict("User with this email already exists")
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role != "admin" && role != "accountant" && role != "viewer" {
		role = "viewer" // default secure fallback role
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.Internal("Failed to hash password")
	}

	now := time.Now().UTC()
	newUser := UserEntity{
		ID:           uuid.New().String(),
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		Phone:        strings.TrimSpace(req.Phone),
		PasswordHash: string(hash),
		Role:         role,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.db.Create(&newUser).Error; err != nil {
		return nil, apperror.Internal("Failed to register user: " + err.Error())
	}

	accessToken, err := s.generateToken(newUser, time.Duration(s.cfg.AccessTTLMin)*time.Minute, "access")
	if err != nil {
		return nil, apperror.Internal("Failed to generate access token")
	}

	refreshToken, err := s.generateToken(newUser, time.Duration(s.cfg.RefreshTTLDay)*24*time.Hour, "refresh")
	if err != nil {
		return nil, apperror.Internal("Failed to generate refresh token")
	}

	middleware.LogAudit(s.db, &newUser.ID, "create", "auth", &newUser.ID, nil, map[string]string{"action": "register", "email": email, "role": role}, clientIP)

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: UserDTO{
			ID:        newUser.ID,
			Name:      newUser.Name,
			Email:     newUser.Email,
			Phone:     newUser.Phone,
			Role:      newUser.Role,
			IsActive:  newUser.IsActive,
			LastLogin: nil,
		},
	}, nil
}

func (s *Service) ForgotPassword(req ForgotPasswordRequest, clientIP string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	var user UserEntity
	if err := s.db.Where("lower(email) = ?", email).First(&user).Error; err != nil {
		return "", apperror.NotFound("No account found with this email address")
	}

	if !user.IsActive {
		return "", apperror.Forbidden("Account is deactivated. Please contact administrator.")
	}

	now := time.Now().UTC()
	claims := jwt.RegisteredClaims{
		Subject:   user.ID,
		Issuer:    "password-reset",
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	resetToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", apperror.Internal("Failed to generate password reset token")
	}

	middleware.LogAudit(s.db, &user.ID, "update", "auth", &user.ID, nil, map[string]string{"action": "forgot_password_requested"}, clientIP)
	return resetToken, nil
}

func (s *Service) ResetPassword(req ResetPasswordRequest, clientIP string) error {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(req.ResetToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid || claims.Issuer != "password-reset" {
		return apperror.Unauthorized("Invalid or expired password reset token")
	}

	var user UserEntity
	if err := s.db.First(&user, "id = ?", claims.Subject).Error; err != nil {
		return apperror.NotFound("User not found")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.Internal("Failed to hash password")
	}

	if err := s.db.Model(&user).Update("password_hash", string(newHash)).Error; err != nil {
		return apperror.Internal("Failed to reset password")
	}

	middleware.LogAudit(s.db, &user.ID, "update", "auth", &user.ID, nil, map[string]string{"action": "password_reset_completed"}, clientIP)
	return nil
}

func (s *Service) UpdateProfile(userID string, req UpdateProfileRequest, clientIP string) (*UserDTO, error) {
	var user UserEntity
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, apperror.NotFound("User not found")
	}

	user.Name = strings.TrimSpace(req.Name)
	user.Phone = strings.TrimSpace(req.Phone)
	user.UpdatedAt = time.Now().UTC()

	if err := s.db.Save(&user).Error; err != nil {
		return nil, apperror.Internal("Failed to update profile: " + err.Error())
	}

	middleware.LogAudit(s.db, &user.ID, "update", "auth", &user.ID, nil, map[string]string{"action": "profile_update", "name": user.Name}, clientIP)

	return &UserDTO{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		Role:      user.Role,
		IsActive:  user.IsActive,
		LastLogin: user.LastLogin,
	}, nil
}

func (s *Service) ChangePassword(userID string, req ChangePasswordRequest, clientIP string) error {
	var user UserEntity
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return apperror.NotFound("User not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return apperror.BadRequest("Current password does not match")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.Internal("Failed to hash password")
	}

	if err := s.db.Model(&user).Update("password_hash", string(newHash)).Error; err != nil {
		return apperror.Internal("Failed to update password")
	}

	middleware.LogAudit(s.db, &user.ID, "update", "auth", &user.ID, nil, map[string]string{"action": "password_change"}, clientIP)
	return nil
}

func (s *Service) generateToken(user UserEntity, ttl time.Duration, tokenType string) (string, error) {
	now := time.Now().UTC()
	claims := middleware.UserClaims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    tokenType,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
