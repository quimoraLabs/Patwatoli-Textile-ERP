package user

import (
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
)

type Service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func (s *Service) Create(req CreateUserRequest, actorID, clientIP string) (*UserResponse, error) {
	existing, _ := s.repo.GetByEmail(req.Email)
	if existing != nil {
		return nil, apperror.Conflict("A user with this email address already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.Internal("Failed to hash password")
	}

	newUser := &User{
		ID:           uuid.New(),
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hash),
		Role:         req.Role,
		IsActive:     true,
	}

	if err := s.repo.Create(newUser); err != nil {
		return nil, apperror.Internal("Failed to create user")
	}

	res := ToResponse(newUser)
	recID := newUser.ID.String()
	middleware.LogAudit(s.db, &actorID, "create", "users", &recID, nil, res, clientIP)

	return &res, nil
}

func (s *Service) GetByID(idStr string) (*UserResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid user ID")
	}

	u, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("User not found")
		}
		return nil, apperror.Internal("Failed to retrieve user")
	}

	res := ToResponse(u)
	return &res, nil
}

func (s *Service) List(offset, limit int) ([]UserResponse, int64, error) {
	users, total, err := s.repo.List(offset, limit)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve users")
	}

	res := make([]UserResponse, len(users))
	for i, u := range users {
		res[i] = ToResponse(&u)
	}

	return res, total, nil
}

func (s *Service) Update(idStr string, req UpdateUserRequest, actorID, clientIP string) (*UserResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid user ID")
	}

	u, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("User not found")
		}
		return nil, apperror.Internal("Failed to retrieve user")
	}

	oldResp := ToResponse(u)

	if req.Name != nil {
		u.Name = *req.Name
	}
	if req.Phone != nil {
		u.Phone = *req.Phone
	}
	if req.Role != nil {
		u.Role = *req.Role
	}
	if req.IsActive != nil {
		u.IsActive = *req.IsActive
	}
	if req.Password != nil && *req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, apperror.Internal("Failed to hash password")
		}
		u.PasswordHash = string(hash)
	}

	if err := s.repo.Update(u); err != nil {
		return nil, apperror.Internal("Failed to update user")
	}

	newResp := ToResponse(u)
	recID := u.ID.String()
	middleware.LogAudit(s.db, &actorID, "update", "users", &recID, oldResp, newResp, clientIP)

	return &newResp, nil
}

func (s *Service) Delete(idStr, actorID, clientIP string) error {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return apperror.BadRequest("Invalid user ID")
	}

	u, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperror.NotFound("User not found")
		}
		return apperror.Internal("Failed to retrieve user")
	}

	if u.Role == "super_admin" {
		return apperror.Forbidden("Cannot delete a super admin account")
	}

	oldResp := ToResponse(u)
	if err := s.repo.Delete(id); err != nil {
		return apperror.Internal("Failed to delete user")
	}

	recID := u.ID.String()
	middleware.LogAudit(s.db, &actorID, "delete", "users", &recID, oldResp, nil, clientIP)

	return nil
}
