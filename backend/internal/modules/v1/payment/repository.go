package payment

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(p *Payment) error
	GetByID(id uuid.UUID) (*Payment, error)
	List(offset, limit int, merchantID *uuid.UUID, fromDate, toDate *time.Time) ([]Payment, int64, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(p *Payment) error {
	return r.db.Create(p).Error
}

func (r *repository) GetByID(id uuid.UUID) (*Payment, error) {
	var p Payment
	err := r.db.Preload("Merchant").First(&p, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *repository) List(offset, limit int, merchantID *uuid.UUID, fromDate, toDate *time.Time) ([]Payment, int64, error) {
	var payments []Payment
	var total int64

	q := r.db.Model(&Payment{})
	if merchantID != nil {
		q = q.Where("merchant_id = ?", *merchantID)
	}
	if fromDate != nil {
		q = q.Where("payment_date >= ?", *fromDate)
	}
	if toDate != nil {
		q = q.Where("payment_date <= ?", *toDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Preload("Merchant").Order("payment_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&payments).Error
	return payments, total, err
}
