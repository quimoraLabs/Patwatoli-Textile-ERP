package item

import (
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(item *Item) error
	GetByID(id uuid.UUID) (*Item, error)
	List(offset, limit int, search string) ([]Item, int64, error)
	Update(item *Item) error
	Delete(id uuid.UUID) error

	AddVariant(v *ItemVariant) error
	GetVariantByID(id uuid.UUID) (*ItemVariant, error)
	UpdateVariant(v *ItemVariant) error
	DeleteVariant(id uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(item *Item) error {
	return r.db.Create(item).Error
}

func (r *repository) GetByID(id uuid.UUID) (*Item, error) {
	var item Item
	err := r.db.Preload("Variants").First(&item, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) List(offset, limit int, search string) ([]Item, int64, error) {
	var items []Item
	var total int64

	q := r.db.Model(&Item{})
	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		q = q.Where("lower(name) LIKE ?", s)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Preload("Variants").Order("name ASC").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}

func (r *repository) Update(item *Item) error {
	return r.db.Save(item).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	return r.db.Delete(&Item{}, "id = ?", id).Error
}

func (r *repository) AddVariant(v *ItemVariant) error {
	return r.db.Create(v).Error
}

func (r *repository) GetVariantByID(id uuid.UUID) (*ItemVariant, error) {
	var v ItemVariant
	err := r.db.First(&v, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *repository) UpdateVariant(v *ItemVariant) error {
	return r.db.Save(v).Error
}

func (r *repository) DeleteVariant(id uuid.UUID) error {
	return r.db.Delete(&ItemVariant{}, "id = ?", id).Error
}
