package merchant

import (
	"time"

	"github.com/google/uuid"
)

type Merchant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string    `gorm:"type:varchar(150);not null;index:idx_merchants_name"`
	Phone     string    `gorm:"type:varchar(15)"`
	Address   string    `gorm:"type:text"`
	GSTIN     *string   `gorm:"type:varchar(15);uniqueIndex:uq_merchants_gstin"`
	CreatedAt time.Time `gorm:"not null;default:now()"`
}

func (Merchant) TableName() string {
	return "merchants"
}
