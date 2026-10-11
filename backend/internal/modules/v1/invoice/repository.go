package invoice

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetByID(id uuid.UUID) (*Invoice, error)
	List(offset, limit int, merchantID *uuid.UUID, status string, fromDate, toDate *time.Time) ([]Invoice, int64, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetByID(id uuid.UUID) (*Invoice, error) {
	var inv Invoice
	err := r.db.
		Preload("Merchant").
		Preload("Items.Item").
		Preload("Items.Variant").
		First(&inv, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *repository) List(offset, limit int, merchantID *uuid.UUID, status string, fromDate, toDate *time.Time) ([]Invoice, int64, error) {
	var invoices []Invoice
	var total int64

	q := r.db.Model(&Invoice{})

	if merchantID != nil {
		q = q.Where("merchant_id = ?", *merchantID)
	}

	if status != "" {
		q = q.Where("status = ?", status)
	}

	if fromDate != nil {
		q = q.Where("invoice_date >= ?", *fromDate)
	}

	if toDate != nil {
		q = q.Where("invoice_date <= ?", *toDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Preload("Merchant").
		Preload("Items.Item").
		Preload("Items.Variant").
		Order("invoice_date DESC, created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&invoices).Error

	return invoices, total, err
}
