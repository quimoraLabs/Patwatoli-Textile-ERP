package ledger

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetEntries(merchantID uuid.UUID, offset, limit int, fromDate, toDate *time.Time) ([]LedgerEntry, int64, error)
	GetLatestBalance(merchantID uuid.UUID) (float64, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetEntries(merchantID uuid.UUID, offset, limit int, fromDate, toDate *time.Time) ([]LedgerEntry, int64, error) {
	var entries []LedgerEntry
	var total int64

	q := r.db.Model(&LedgerEntry{}).Where("merchant_id = ?", merchantID)
	if fromDate != nil {
		q = q.Where("entry_date >= ?", *fromDate)
	}
	if toDate != nil {
		q = q.Where("entry_date <= ?", *toDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("entry_date DESC, created_at DESC, id DESC").Offset(offset).Limit(limit).Find(&entries).Error
	return entries, total, err
}

func (r *repository) GetLatestBalance(merchantID uuid.UUID) (float64, error) {
	var balance float64
	row := r.db.Raw(`
		SELECT balance 
		FROM ledger 
		WHERE merchant_id = ? 
		ORDER BY created_at DESC, id DESC 
		LIMIT 1
	`, merchantID).Row()

	if err := row.Scan(&balance); err != nil {
		return 0.0, nil
	}
	return balance, nil
}
