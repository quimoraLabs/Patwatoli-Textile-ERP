package user

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name         string     `gorm:"type:varchar(100);not null"`
	Email        string     `gorm:"type:varchar(150);not null;uniqueIndex:uq_users_email"`
	Phone        string     `gorm:"type:varchar(15)"`
	PasswordHash string     `gorm:"type:text;not null"`
	Role         string     `gorm:"type:varchar(20);not null"`
	IsActive     bool       `gorm:"not null;default:true"`
	LastLogin    *time.Time `gorm:""`
	CreatedAt    time.Time  `gorm:"not null;default:now()"`
	UpdatedAt    time.Time  `gorm:"not null;default:now()"`
}

func (User) TableName() string {
	return "users"
}
