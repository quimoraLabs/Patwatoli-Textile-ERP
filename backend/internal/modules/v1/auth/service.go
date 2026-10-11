package auth

import (
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
)

type UserEntity struct {
	ID           string     `gorm:"type:uuid;primaryKey"`
	Name         string     `gorm:"column:name"`
	Email        string     `gorm:"column:email"`
	Phone        string     `gorm:"column:phone"`
	PasswordHash string     `gorm:"column:password_hash"`
	Role         string     `gorm:"column:role"`
	IsActive     bool       `gorm:"column:is_active"`
	LastLogin    *time.Time `gorm:"column:last_login"`
	CreatedAt    time.Time  `gorm:"column:created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
}

func (UserEntity) TableName() string {
	return "users"
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

	if !user.IsActive {
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
		User: UserDTO{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			LastLogin: user.LastLogin,
		},
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

	if !user.IsActive {
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
		User: UserDTO{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			LastLogin: user.LastLogin,
		},
	}, nil
}

func (s *Service) Me(userID string) (*UserDTO, error) {
	var user UserEntity
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, apperror.NotFound("User profile not found")
	}

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
