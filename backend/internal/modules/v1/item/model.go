package item

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID        uuid.UUID     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string        `gorm:"type:varchar(150);not null;uniqueIndex:uq_items_name"`
	Unit      string        `gorm:"type:varchar(10);not null"`
	CreatedAt time.Time     `gorm:"not null;default:now()"`
	Variants  []ItemVariant `gorm:"foreignKey:ItemID"`
}

func (Item) TableName() string {
	return "items"
}

type ItemVariant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ItemID    uuid.UUID `gorm:"type:uuid;not null;index:idx_item_variants_item"`
	Size      string    `gorm:"type:varchar(5);not null"`
	Rate      float64   `gorm:"type:numeric(12,2);not null"`
	CreatedAt time.Time `gorm:"not null;default:now()"`
}

func (ItemVariant) TableName() string {
	return "item_variants"
}
