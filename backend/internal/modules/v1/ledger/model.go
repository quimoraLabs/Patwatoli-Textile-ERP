package ledger

import (
	"time"

	"github.com/google/uuid"

	"patwatoli-erp/internal/modules/v1/merchant"
)

type LedgerEntry struct {
	ID              uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	MerchantID      uuid.UUID         `gorm:"type:uuid;not null;index:idx_ledger_merchant_created"`
	TransactionType string            `gorm:"type:varchar(20);not null"`
	ReferenceID     uuid.UUID         `gorm:"type:uuid;not null;index:idx_ledger_reference"`
	Debit           float64           `gorm:"type:numeric(12,2);not null;default:0"`
	Credit          float64           `gorm:"type:numeric(12,2);not null;default:0"`
	Balance         float64           `gorm:"type:numeric(12,2);not null"`
	EntryDate       time.Time         `gorm:"type:date;not null"`
	CreatedAt       time.Time         `gorm:"not null;default:now()"`
	Merchant        merchant.Merchant `gorm:"foreignKey:MerchantID"`
}

func (LedgerEntry) TableName() string {
	return "ledger"
}
