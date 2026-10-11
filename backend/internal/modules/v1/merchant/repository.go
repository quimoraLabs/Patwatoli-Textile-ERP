package merchant

import (
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(m *Merchant) error
	GetByID(id uuid.UUID) (*Merchant, error)
	List(offset, limit int, search string) ([]Merchant, int64, error)
	Update(m *Merchant) error
	Delete(id uuid.UUID) error
	GetMerchantBalance(merchantID uuid.UUID) (float64, error)
	GetBalancesForMerchants(ids []uuid.UUID) (map[uuid.UUID]float64, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(m *Merchant) error {
	return r.db.Create(m).Error
}

func (r *repository) GetByID(id uuid.UUID) (*Merchant, error) {
	var m Merchant
	err := r.db.First(&m, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *repository) List(offset, limit int, search string) ([]Merchant, int64, error) {
	var merchants []Merchant
	var total int64

	q := r.db.Model(&Merchant{})
	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		q = q.Where("lower(name) LIKE ? OR phone LIKE ?", s, s)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("name ASC").Offset(offset).Limit(limit).Find(&merchants).Error
	return merchants, total, err
}

func (r *repository) Update(m *Merchant) error {
	return r.db.Save(m).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	return r.db.Delete(&Merchant{}, "id = ?", id).Error
}

func (r *repository) GetMerchantBalance(merchantID uuid.UUID) (float64, error) {
	var balance float64
	row := r.db.Raw(`
		SELECT balance 
		FROM ledger 
		WHERE merchant_id = ? 
		ORDER BY created_at DESC, id DESC 
		LIMIT 1
	`, merchantID).Row()

	if err := row.Scan(&balance); err != nil {
		// No ledger entry yet = 0 balance
		return 0, nil
	}
	return balance, nil
}

func (r *repository) GetBalancesForMerchants(ids []uuid.UUID) (map[uuid.UUID]float64, error) {
	balances := make(map[uuid.UUID]float64)
	if len(ids) == 0 {
		return balances, nil
	}

	type Result struct {
		MerchantID uuid.UUID
		Balance    float64
	}

	var results []Result
	err := r.db.Raw(`
		SELECT DISTINCT ON (merchant_id) merchant_id, balance
		FROM ledger
		WHERE merchant_id IN ?
		ORDER BY merchant_id, created_at DESC, id DESC
	`, ids).Scan(&results).Error

	if err != nil {
		return nil, err
	}

	for _, res := range results {
		balances[res.MerchantID] = res.Balance
	}

	return balances, nil
}
