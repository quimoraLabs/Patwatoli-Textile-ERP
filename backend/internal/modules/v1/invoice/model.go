package invoice

import (
	"time"

	"github.com/google/uuid"

	"patwatoli-erp/internal/modules/v1/item"
	"patwatoli-erp/internal/modules/v1/merchant"
)

type Invoice struct {
	ID            uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	InvoiceNo     string            `gorm:"type:varchar(30);not null;uniqueIndex"`
	MerchantID    uuid.UUID         `gorm:"type:uuid;not null;index:idx_invoices_merchant_date"`
	InvoiceDate   time.Time         `gorm:"type:timestamptz;not null;index:idx_invoices_date"`
	TaxableAmount float64           `gorm:"type:numeric(12,2);not null"`
	CGST          float64           `gorm:"type:numeric(12,2);not null;default:0"`
	SGST          float64           `gorm:"type:numeric(12,2);not null;default:0"`
	TotalAmount   float64           `gorm:"type:numeric(12,2);->"` // Read-only / stored generated
	Status        string            `gorm:"type:varchar(10);not null;default:'active';index:idx_invoices_status"`
	CancelledAt   *time.Time        `gorm:"type:timestamptz"`
	CancelReason  *string           `gorm:"type:text"`
	CreatedAt     time.Time         `gorm:"not null;default:now()"`
	Merchant      merchant.Merchant `gorm:"foreignKey:MerchantID"`
	Items         []InvoiceItem     `gorm:"foreignKey:InvoiceID"`
}

func (Invoice) TableName() string {
	return "invoices"
}

type InvoiceItem struct {
	ID        uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	InvoiceID uuid.UUID        `gorm:"type:uuid;not null;index:idx_invoice_items_invoice"`
	ItemID    uuid.UUID        `gorm:"type:uuid;not null;index:idx_invoice_items_item"`
	VariantID uuid.UUID        `gorm:"type:uuid;not null"`
	Qty       float64          `gorm:"type:numeric(12,3);not null"`
	Rate      float64          `gorm:"type:numeric(12,2);not null"`
	Amount    float64          `gorm:"type:numeric(12,2);->"` // Read-only / stored generated
	Item      item.Item        `gorm:"foreignKey:ItemID"`
	Variant   item.ItemVariant `gorm:"foreignKey:VariantID"`
}

func (InvoiceItem) TableName() string {
	return "invoice_items"
}
