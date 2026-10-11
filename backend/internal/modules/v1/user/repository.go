package user

import (
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(u *User) error
	GetByID(id uuid.UUID) (*User, error)
	GetByEmail(email string) (*User, error)
	List(offset, limit int) ([]User, int64, error)
	Update(u *User) error
	Delete(id uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(u *User) error {
	return r.db.Create(u).Error
}

func (r *repository) GetByID(id uuid.UUID) (*User, error) {
	var u User
	err := r.db.First(&u, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *repository) GetByEmail(email string) (*User, error) {
	var u User
	err := r.db.First(&u, "lower(email) = ?", strings.ToLower(email)).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *repository) List(offset, limit int) ([]User, int64, error) {
	var users []User
	var total int64
	if err := r.db.Model(&User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := r.db.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error
	return users, total, err
}

func (r *repository) Update(u *User) error {
	return r.db.Save(u).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	return r.db.Delete(&User{}, "id = ?", id).Error
}
