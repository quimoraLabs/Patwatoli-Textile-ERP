package payment

import (
	"time"

	"github.com/google/uuid"

	"patwatoli-erp/internal/modules/v1/merchant"
)

type Payment struct {
	ID          uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	MerchantID  uuid.UUID         `gorm:"type:uuid;not null;index:idx_payments_merchant_date"`
	Amount      float64           `gorm:"type:numeric(12,2);not null"`
	PaymentMode string            `gorm:"type:varchar(10);not null"`
	PaymentDate time.Time         `gorm:"type:date;not null"`
	CreatedAt   time.Time         `gorm:"not null;default:now()"`
	Merchant    merchant.Merchant `gorm:"foreignKey:MerchantID"`
}

func (Payment) TableName() string {
	return "payments"
}
